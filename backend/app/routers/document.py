import aiofiles
import os
from fastapi import Depends, APIRouter, UploadFile, Form, File, HTTPException
from sqlalchemy.orm import Session
from app.routers.auth import get_current_user
from app.database import get_db
from app.schemas.document import DocumentCreate, DocumentResponse
from app.models import User
from app.services.document_service import DocumentServices
from app.services.organization_service import OrganizationService
import uuid

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)
router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


@router.post("/organization/{org_id}", response_model=list[DocumentResponse])
def list_documents(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DocumentServices.list_of_documents(db, org_id, current_user)


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    title: str = Form(...),
    content: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...),
    organization_id: int = Form(...),
):
    # Checking MemeberShip
    OrganizationService.required_membership(db, organization_id, current_user.id)

    if not file.filename:
        raise HTTPException(status_code=400, detail="File does not exist")
    # type of file
    extension = os.path.splitext(file.filename)[1]

    unique_name = f"{uuid.uuid4()}{extension}"

    # path of save file
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    # Saving File
    async with aiofiles.open(file_path, "wb") as f:
        # read will with chunks of 1MB and then write till chunk give empty data
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)
    doc_data = DocumentCreate(
        title=title,
        content=content,
        organization_id=organization_id,
        file_path=file_path,
    )
    return DocumentServices.create(db, doc_data, current_user)
