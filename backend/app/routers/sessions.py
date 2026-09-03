import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.chats import ChatSession, ChatMessage
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.chats import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageResponse,
)
from app.services.organization_service import OrganizationService

# Prefix /organizations -> POST/GET /organizations/{org_id}/sessions
org_router = APIRouter(prefix="/organizations", tags=["chats"])

# Prefix /sessions -> GET/DELETE /sessions/{session_id}[/messages]
session_router = APIRouter(prefix="/sessions", tags=["chats"])


@org_router.post(
    "/{org_id}/sessions", response_model=ChatSessionResponse, status_code=201
)
def create_chat_session(
    org_id: int,
    chat_session: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    OrganizationService.required_membership(db, org_id, current_user.id)
    new_session = ChatSession(
        id=str(uuid.uuid4()),
        workspace_id=org_id,
        owner_id=current_user.id,
        title=chat_session.title or "New chat",
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    new_session.owner_name = current_user.name or current_user.email
    return new_session


@org_router.get(
    "/{org_id}/sessions", response_model=list[ChatSessionResponse]
)
def list_chat_sessions(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    OrganizationService.required_membership(db, org_id, current_user.id)
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.workspace_id == org_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    result = []
    for s in sessions:
        s.owner_name = s.owner.name if s.owner else None
        result.append(s)
    return result


@session_router.get(
    "/{session_id}/messages", response_model=list[ChatMessageResponse]
)
def get_chat_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    OrganizationService.required_membership(
        db, session.workspace_id, current_user.id
    )
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    result = []
    for m in messages:
        m.user_name = m.user.name if m.user else None
        result.append(m)
    return result


@session_router.delete("/{session_id}", status_code=204)
def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    OrganizationService.required_membership(
        db, session.workspace_id, current_user.id
    )
    if session.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this session",
        )
    db.delete(session)
    db.commit()
