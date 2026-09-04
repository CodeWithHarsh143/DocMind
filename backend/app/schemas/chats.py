from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ChatSessionResponse(BaseModel):
    id: str
    workspace_id: int
    owner_id: int
    owner_name: str | None = None
    title: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    content: str
    role: str
    user_id: int | None = None
    user_name: str | None = None
    user_avatar_url: str | None = None
    sources: list[dict] | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ChatSessionCreate(BaseModel):
    title: str | None = None


class ChatMessageCreate(BaseModel):
    content: str
    role: str


class ChatRequest(BaseModel):
    session_id: str
    question: str
