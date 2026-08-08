from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DocumentCreate(BaseModel):
    title: str
    content: str
    organization_id: int


class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    owner_id: int
    organization_id: int

    model_config = ConfigDict(from_attributes=True)
