from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.organization import RoleEnum, StatusEnum


class OrganizationCreate(BaseModel):
    name: str


class OrganizationResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationMemberResponse(BaseModel):
    id: int
    user_id: int
    organization_id: int
    role: RoleEnum
    logo_url: str
    description: str
    model_config = ConfigDict(from_attributes=True)


class OrganizationWithMembersResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    members: list[OrganizationMemberResponse] = []
    email: str
    status: StatusEnum
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)
