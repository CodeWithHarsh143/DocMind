from app.database import SessionLocal
from app.models.document import Document
from app.services.file_processing import extract_text_from_document
from app.services.chunking.fixed_size import FixedSizeChunker
from app.services.chunking.embedding_service import generate_embedding
from app.models.chunk import DocumentChunk
from app.queue import document_queue
import traceback


def process_document_tasks(document_id: int):
    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return

        try:
            extracted_text = extract_text_from_document(document.file_path)
        except Exception:
            document.processing_status = "failed"
            db.commit()
            return

        document.content = extracted_text
        document.processing_status = "completed"
        db.commit()

        document_queue.enqueue(process_embeddings, document_id)
    finally:
        db.close()


def process_embeddings(document_id):
    db = SessionLocal()

    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document or not document.content:
            return
        chunker = FixedSizeChunker(chunk_size=500, overlap=50)
        text_chunks = chunker.chunk(document.content)
        for chunk_text in text_chunks:
            embedding = generate_embedding(chunk_text)
            doc_chunk = DocumentChunk(
                document_id=document_id,
                organization_id=document.organization_id,
                content=chunk_text,
                embedding=embedding,
            )
            db.add(doc_chunk)

        db.commit()
    except Exception as e:
        print("embedding generation failed:", e)
        traceback.print_exc()
    finally:
        db.close()
