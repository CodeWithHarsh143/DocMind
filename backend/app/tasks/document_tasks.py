from app.database import SessionLocal
from app.models.document import Document
from app.services.file_processing import extract_text_from_document


def process_document_tasks(document_id: int):
    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return
        document.processing_status = "pending"
        db.commit()

        extracted_text = extract_text_from_document(document.file_path)
        document.content = extracted_text
        document.processing_status = "completed"
        document.commit()
    except Exception as e:
        document.processing_status = "failed"
        db.commit()
    finally:
        db.close()
