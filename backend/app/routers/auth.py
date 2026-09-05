import hashlib, secrets, logging

import httpx
from app.config import settings
from jose import jwt
import hmac
from fastapi import Depends, HTTPException, logger, status, APIRouter
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.security import (
    hash_password,
    verify_password,
    decode_access_token,
)
from app.database import get_db
from app.models.user import User
from app.models.organization import OrganizationMember
from app.schemas.user import (
    RequestOtp,
    UserCreate,
    UserResponse,
    RefreshTokenRequest,
    VerifyOtp,
    ResetPassword,
    googleAuthRequest,
)
from datetime import datetime, timedelta, timezone
from app.queue import redis_conn
from fastapi.security import OAuth2PasswordRequestForm
from app.services.auth_service import AuthService
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        if existing_user.hashed_password is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        existing_user.hashed_password = hash_password(user_data.password)
        db.query(OrganizationMember).filter(
            OrganizationMember.user_id == existing_user.id,
            OrganizationMember.status == "pending",
        ).update({"status": "active"})
        db.commit()
        db.refresh(existing_user)
        return existing_user

    hashed = hash_password(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    tokens = AuthService.create_token_user(db=db, user_id=user.id)
    return {**tokens, "token_type": "bearer"}


@router.post("/refresh")
def refresh_token(body: RefreshTokenRequest, db: Session = Depends(get_db)) -> dict:
    new_access_token = AuthService.refresh_access_token(
        db=db, refresh_token_str=body.refresh_token
    )

    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(body: RefreshTokenRequest, db: Session = Depends(get_db)) -> dict:
    AuthService.revoke_refresh_token(db=db, refresh_token_str=body.refresh_token)
    return {"detail": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/request-otp")
def request_otp(request: RequestOtp, db: Session = Depends(get_db)):
    identifier = request.identifier.lower().strip()
    code = f"{secrets.randbelow(10**6):06d}"
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    redis_conn.setex(
        name=f"otp:{identifier}",
        value=f"{code_hash}:0",
        time=timedelta(minutes=10),
    )
    try:
        EmailService.send_otp_email(to=identifier, code=code)
    except Exception:
        logger.info(
            "OTP email failed to send to %s; falling back to log: %s",
            identifier,
            code,
            exc_info=True,
        )
    return {
        "expires_in": 600,
        "message": "OTP generated successfully. Check your email for the code.",
    }


@router.post("/verify-otp")
def verify_otp(request: VerifyOtp, db: Session = Depends(get_db)):
    identifier = request.identifier.lower().strip()
    otp_key = f"otp:{identifier}"
    stored_value = redis_conn.get(otp_key)

    if not stored_value:
        raise HTTPException(status_code=400, detail="OTP expired or not found.")

    stored_hash, attempts_str = stored_value.decode().split(":")
    attempts = int(attempts_str)

    if attempts >= 5:
        redis_conn.delete(otp_key)
        raise HTTPException(status_code=400, detail="Too many failed attempts.")

    provided_hash = hashlib.sha256(request.code.encode()).hexdigest()

    if not hmac.compare_digest(stored_hash, provided_hash):
        redis_conn.setex(
            name=otp_key,
            value=f"{stored_hash}:{attempts + 1}",
            time=timedelta(minutes=10),
        )
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    user = db.query(User).filter(User.email == identifier).first()
    sub = str(user.id) if user else "pending"
    reset_token = jwt.encode(
        {"sub": sub, "exp": datetime.now(tz=timezone.utc) + timedelta(minutes=10)},
        settings.secret_key,
        algorithm="HS256",
    )
    return {"verified": True, "reset_token": reset_token}


@router.post("/reset-password")
def reset_password(body: ResetPassword, db: Session = Depends(get_db)):
    identifier = body.identifier.strip().lower()

    # 1. Re-verify the code (same logic as verify-otp)
    stored = redis_conn.get(f"otp:{identifier}")
    if not stored:
        raise HTTPException(400, "That code did not verify. Please try again.")

    code_hash, _ = stored.decode().split(":")
    input_hash = hashlib.sha256(body.code.encode()).hexdigest()
    if not hmac.compare_digest(code_hash, input_hash):
        raise HTTPException(400, "That code did not verify. Please try again.")

    redis_conn.delete(f"otp:{identifier}")

    user = db.query(User).filter(User.email == identifier).first()

    if user:
        # Existing user (or invited pending user) → set password
        user.hashed_password = hash_password(body.new_password)
    else:
        # New user from OTP — create account
        user = User(
            email=identifier,
            hashed_password=hash_password(body.new_password),
        )
        db.add(user)

    # 4. If invited pending member → activate them
    db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user.id,
        OrganizationMember.status == "pending",
    ).update({"status": "active"})

    db.commit()

    return {"detail": "Password updated"}


@router.post("/google")
def google_login(body: googleAuthRequest, db: Session = Depends(get_db)):
    GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
    try:
        resp = httpx.get(
            GOOGLE_TOKENINFO_URL, params={"id_token": body.id_token}, timeout=10.0
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google token")
        token_data = resp.json()
    except httpx.RequestError as e:
        logger.error(f"HTTP request error while verifying Google token: {e}")
        raise HTTPException(
            status_code=400, detail="Unable to verify Google token. Please try again."
        )
    google_client_id = settings.google_client_id
    aud = token_data.get("aud")
    if google_client_id and aud != google_client_id:
        raise HTTPException(status_code=400, detail="Invalid Google token.")
    email = token_data.get("email")
    if not email:
        raise HTTPException(
            status_code=400, detail="Google token does not contain email."
        )
    verified_email = token_data.get("email_verified")
    if not verified_email:
        raise HTTPException(status_code=400, detail="Google email not verified.")
    given_name = token_data.get("given_name", "")
    family_name = token_data.get("family_name", "")
    picture = token_data.get("picture", "")
    name_parts = [part for part in [given_name, family_name] if part]
    full_name = " ".join(name_parts) if name_parts else None
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        update_data = {}
        if full_name and not user.name:
            update_data["name"] = full_name
        if picture and not user.avatar_url:
            update_data["avatar_url"] = picture
        if update_data:
            for key, value in update_data.items():
                setattr(user, key, value)
            db.commit()

    db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user.id,
        OrganizationMember.status == "pending",
    ).update({"status": "active"})
    db.commit()

    tokens = AuthService.create_token_user(db=db, user_id=user.id)
    return {**tokens, "token_type": "bearer"}
