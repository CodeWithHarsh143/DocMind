from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from datetime import datetime
import re


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Name should only contain letters.")
        if not re.fullmatch(r"[A-Za-z\s]+", trimmed):
            raise ValueError("Name should only contain letters.")
        if len(trimmed) > 60:
            raise ValueError("Name must be 60 characters or fewer.")
        return trimmed

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        trimmed = v.strip()
        if not trimmed:
            return None
        if not re.fullmatch(r"\+?\d[\d\s().-]{6,19}", trimmed):
            raise ValueError("Enter a valid phone number.")
        digits = re.sub(r"\D", "", trimmed)
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must be 7–15 digits.")
        return trimmed


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RequestOtp(BaseModel):
    identifier: str


class VerifyOtp(BaseModel):
    identifier: str
    code: str


class ResetPassword(BaseModel):
    identifier: str
    code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain an uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain a lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a digit")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:',.<>?/" for c in v):
            raise ValueError("Password must contain a special character")
        return v


class googleAuthRequest(BaseModel):
    id_token: str
