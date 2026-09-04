from datetime import datetime, timezone
import asyncio
import json
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session
from openai import AsyncOpenAI, APIStatusError
from app.models.chats import ChatMessage, ChatSession
from app.models.chunk import DocumentChunk
from app.config import settings
from app.services.cache_service import set_cached_key

client = AsyncOpenAI(
    api_key=settings.gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)


def search_similar_chunks(
    db: Session, query_embedding: list[float], organization_id: int, top_k: int = 5
):
    return db.scalars(
        select(DocumentChunk)
        .filter(DocumentChunk.organization_id == organization_id)
        .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    ).all()


def build_rag_propmt(question: str, chunks: list[DocumentChunk]) -> str:
    context = "\n\n---\n\n".join([chunk.content for chunk in chunks])

    prompt = f"""You are a helpful assistant answering questions based on the provided documents.

    Context from documents:
    {context}

    Question: {question}

    Answer the question using only the information from the context above. If the context doesn't contain relevant information, say so."""

    return prompt


def build_source_payload(chunks: list[DocumentChunk]) -> list[dict]:
    """Flattens the retrieved chunks into the `sources` shape the client renders.

    Titles are resolved from each chunk's owning document. Chunks are already
    ordered by relevance, so a `set` of seen document ids keeps only the most
    relevant chunk per document — preventing the same document appearing as
    duplicate chips. Called with the DB session still open (chat_with_document),
    so lazy-loading `chunk.document` works — the payload is captured up-front and
    passed into the streaming generator, which runs after the session has closed.
    """
    sources = []
    seen_documents: set[int] = set()
    for chunk in chunks:
        document_id = chunk.document_id
        if document_id in seen_documents:
            continue
        seen_documents.add(document_id)
        title = chunk.document.title if chunk.document else None
        sources.append(
            {
                "document_id": document_id,
                "document_title": title or f"Document {document_id}",
                "content": chunk.content[:500],
            }
        )
    return sources


def _friendly_upstream_error(exc: Exception) -> str:
    """Maps an upstream/provider error to a short, honest user-facing message."""
    if isinstance(exc, APIStatusError):
        status = exc.status_code
        if status == 503:
            return (
                "The AI model is currently experiencing high demand. "
                "Please try again in a moment."
            )
        return f"The AI service returned an error ({status}). Please try again."
    if isinstance(exc, TimeoutError):
        return "The AI service timed out. Please try again."
    return "An unexpected error occurred while generating the answer."


def _persist_assistant_answer(
    db: Session, session_id: str, content: str, sources: list[dict]
) -> None:
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        content=content,
        role="assistant",
        user_id=None,
        sources=sources,
    )
    db.add(assistant_msg)
    db.commit()


async def stream_rag_answer(
    db: Session,
    question: str,
    chunks: list[DocumentChunk],
    organization_id: int,
    session_id: str,
    user_id: int,
    sources: list[dict],
):
    prompt = build_rag_propmt(question, chunks)
    # Emit the grounding evidence as a structured frame before the answer so the
    # client can render source chips immediately (handleLine parses JSON sources).
    yield f"data: {json.dumps({'sources': sources})}\n\n"
    full_answer = ""
    try:
        stream = await client.chat.completions.create(
            model="gemini-3.6-flash",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_answer += token
                yield token
    except asyncio.CancelledError:
        # Client disconnected (stop button / navigation). The DB session is being
        # torn down at this point, so don't attempt any writes — just stop
        # generation and let the cancellation propagate cleanly. The partial
        # answer is already visible in the client UI.
        raise
    except Exception as exc:
        # Surface an upstream/provider or streaming failure as a readable token
        # instead of crashing the whole streamed response. The user message was
        # already persisted above, so record a short fallback answer too.
        message = _friendly_upstream_error(exc)
        full_answer = f"⚠️ I couldn't generate an answer right now.\n\n{message}"
        yield full_answer
    _persist_assistant_answer(db, session_id, full_answer, sources)
    db.query(ChatSession).filter(ChatSession.id == session_id).update(
        {"updated_at": datetime.now(timezone.utc)}
    )
    db.commit()
    set_cached_key(
        organization_id=organization_id, question=question, answer=full_answer
    )
