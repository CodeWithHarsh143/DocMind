import aiofiles
import os
from fastapi import Depends, APIRouter, UploadFile, Form, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.routers.auth import get_current_user
from app.models.document import Document
from app.database import get_db
from app.schemas.document import DocumentCreate, DocumentResponse
from app.models import User, organization
from app.services.chunking.embedding_service import generate_embedding
from app.services.document_service import DocumentService
from app.services.organization_service import OrganizationService
import uuid
from app.tasks.document_tasks import process_document_tasks
from app.queue import document_queue
from app.services.rag_service import search_similar_chunks,stream_rag_answer
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "storage", "uploads"
)

os.makedirs(UPLOAD_DIR, exist_ok=True)
router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


@router.get("/organization/{org_id}", response_model=list[DocumentResponse])
def list_documents(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DocumentService.list_of_documents(db, org_id, current_user)


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    title: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...),
    organization_id: int = Form(...),
):
    # Checking membership
    OrganizationService.required_membership(db, organization_id, current_user.id)

    if not file.filename:
        raise HTTPException(status_code=400, detail="File does not exist")
    # type of file
    extension = os.path.splitext(file.filename)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    unique_name = f"{uuid.uuid4()}{extension}"

    final_title = (
        (title.strip() if title and title.strip() else None)
        or file.filename
        or "Untitled Document"
    )

    # path of save file
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    # Saving File
    async with aiofiles.open(file_path, "wb") as f:
        # read will with chunks of 1MB and then write till chunk give empty data
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)
    doc_data = DocumentCreate(
        title=final_title,
        organization_id=organization_id,
        file_path=file_path,
    )
    try:
        document = DocumentService.create(db, doc_data, current_user)
    except Exception:
        os.remove(file_path)
        raise
    document_queue.enqueue(process_document_tasks, document.id)
    return document


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document Not Found")
    OrganizationService.required_membership(
        db, document.organization_id, current_user.id
    )
    return document

@router.post("/chat/{organization_id}")
async def chat_with_document(
        organization_id:int,
        question:str,
        current_user:User = Depends(get_current_user),
        db:Session = Depends(get_db)
):
    OrganizationService.required_membership(db=db,organization_id=organization_id,user_id=current_user.id)
    query_embedding = generate_embedding(question)
    chunks = search_similar_chunks(db,query_embedding,organization_id)
    if not chunks :
        raise HTTPException(
            status_code=404,
            detail="No relevant documents found"
        )
    return StreamingResponse(
        stream_rag_answer(question,chunks),
        media_type="text/event-stream"
    )

