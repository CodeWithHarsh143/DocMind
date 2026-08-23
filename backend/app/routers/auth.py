from fastapi import Depends, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.security import (
    hash_password,
    verify_password,
    decode_access_token,
)
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, RefreshTokenRequest

from fastapi.security import OAuth2PasswordRequestForm
from app.services.auth_service import AuthService

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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
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
