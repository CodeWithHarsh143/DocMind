from app.core.security import create_access_token, create_refresh_token
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.models.refresh_token import RefreshToken
from fastapi import HTTPException


class AuthService:
    @staticmethod
    def create_token_user(db: Session, user_id: int) -> dict:
        access_token = create_access_token({"sub": str(user_id)})
        refresh_token_str = create_refresh_token()

        refresh_token = RefreshToken(
            user_id=user_id,
            token=refresh_token_str,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None)
            + timedelta(days=7),
        )
        db.add(refresh_token)
        db.commit()

        return {"access_token": access_token, "refresh_token": refresh_token_str}

    @staticmethod
    def refresh_access_token(db: Session, refresh_token_str: str) -> str:
        token_record = (
            db.query(RefreshToken)
            .filter(RefreshToken.token == refresh_token_str)
            .first()
        )

        if not token_record or token_record.revoked:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if token_record.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
            raise HTTPException(status_code=401, detail="Refresh token expired")

        return create_access_token({"sub": str(token_record.user_id)})

    @staticmethod
    def revoke_refresh_token(db: Session, refresh_token_str: str):
        token_record = (
            db.query(RefreshToken)
            .filter(RefreshToken.token == refresh_token_str)
            .first()
        )
        if token_record:
            token_record.revoked = True
            db.commit()
