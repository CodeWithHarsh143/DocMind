from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
import re
from app.models.organization import RoleEnum, StatusEnum


class OrganizationCreate(BaseModel):
    name: str


class OrganizationResponse(BaseModel):
    id: int
    name: str
    description: str | None
    logo_url: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationMemberResponse(BaseModel):
    id: int
    user_id: int
    role: RoleEnum
    name: str | None
    email: str | None
    avatar_url: str | None = None
    status: StatusEnum | None = None
    joined_at: datetime | None = None

    # for database model to pydantic model conversion
    model_config = ConfigDict(from_attributes=True)


class OrganizationWithMembersResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    logo_url: str | None = None
    created_at: datetime
    members: list[OrganizationMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)


class InviteMemberRequest(BaseModel):
    email: str
    role: RoleEnum


class UpdateMemberRole(BaseModel):
    role: RoleEnum


class OrganizationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    logo_url: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Organization name is required.")
        if len(trimmed) < 2:
            raise ValueError("Organization name must be at least 2 characters.")
        if len(trimmed) > 60:
            raise ValueError("Organization name must be 60 characters or fewer.")
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9 _&'.,-]*$", trimmed):
            raise ValueError(
                "Use letters, numbers, spaces and basic punctuation only (no special characters)."
            )
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if len(v) > 200:
            raise ValueError("Description must be 200 characters or fewer.")
        if any(ord(ch) < 32 and ch not in ("\t", "\n", "\r") for ch in v):
            raise ValueError("Description contains unsupported characters.")
        return v
