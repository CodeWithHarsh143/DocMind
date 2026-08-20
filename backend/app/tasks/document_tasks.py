from app.database import SessionLocal
from app.models import chunk
from app.models.document import Document
from app.services.file_processing import extract_text_from_document
from app.services.chunking.fixed_size import FixedSizeChunker
from app.services.chunking.embedding_service import generate_embedding
from app.models.chunk import DocumentChunk


def process_document_tasks(document_id: int):
    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return
        document.processing_status = "pending"
        db.commit()

        extracted_text = extract_text_from_document(document.file_path)
        from app.queue import document_queue

        document_queue.enqueue(generate_embedding, document_id)
        document.content = extracted_text
        document.processing_status = "completed"
        db.commit()
    except Exception as e:
        document.processing_status = "failed"
        db.commit()
    finally:
        db.close()


def generate_embedding(document_id):
    db = SessionLocal()

    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document or not document.content:
            return
        chunker = FixedSizeChunker(chunk_size=500, overlap=50)
        text_chunk = chunker.chunk(document.content)
        for chunk_text in text_chunk:
            embedding = generate_embedding(chunk_text)
            chunk = DocumentChunk(
                document_id=document_id,
                organization_id=document.organization_id,
                content=chunk_text,
                embedding=embedding,
            )
            db.add(chunk)

        db.commit()
    except Exception as e:
        print("embedding generation is falied:", e)
    finally:
        db.close()
