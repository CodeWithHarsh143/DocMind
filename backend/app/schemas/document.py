from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DocumentCreate(BaseModel):
    title: str
    organization_id: int
    file_path: str


class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    owner_id: int
    organization_id: int

    model_config = ConfigDict(from_attributes=True)
