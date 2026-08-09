from sqlalchemy.orm import Session
from app.models.document import Document
from app.models.user import User
from app.services.organization_service import OrganizationService
from app.schemas.document import DocumentCreate


class DocumentServices:
    @staticmethod
    def create(db: Session, doc_data: DocumentCreate, current_user: User) -> Document:
        # Checking if user is in organization
        OrganizationService.required_membership(
            db, current_user.id, doc_data.organization_id
        )

        new_doc = Document(
            title=doc_data.title,
            content=doc_data.content,
            organization_id=doc_data.organization_id,
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)

        return new_doc

    @staticmethod
    def list_of_orginizations(
        db: Session, organization_id: int, current_user: User
    ) -> list[Document]:
        # Checking if user is in organization
        OrganizationService.required_membership(db, organization_id, current_user.id)

        return (
            db.query(Document).filter(Document.organization_id == organization_id).all()
        )
