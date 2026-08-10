from fastapi import Depends, APIRouter
from sqlalchemy.orm import Session
from app.routers.auth import get_current_user
from app.database import get_db
from app.schemas.document import DocumentCreate, DocumentResponse
from app.models import User
from app.services.document_service import DocumentServices


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


@router.post("/", response_model=DocumentResponse, status_code=201)
def create(
    doc_data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DocumentServices.create(db, doc_data, current_user)


@router.post("/organization/{org_id}", response_model=list[DocumentResponse])
def list_documents(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DocumentServices.list_of_documents(db, org_id, current_user)