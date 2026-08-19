from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DocumentCreate(BaseModel):
    title: str
    organization_id: int
    file_path: str


class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str | None = None
    created_at: datetime
    owner_id: int
    organization_id: int
    processing_status: str

    model_config = ConfigDict(from_attributes=True)
