from sqlalchemy import select
from sqlalchemy.orm import Session
from openai import OpenAI
from app.models import organization
from app.models.chunk import DocumentChunk
from app.config import settings
from app.services.cache_service import set_cached_key

client = OpenAI(
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


async def stream_rag_answer(
    question: str, chunks: list[DocumentChunk], organization_id: int
):
    prompt = build_rag_propmt(question, chunks)
    stream = client.chat.completions.create(
        model="gemini-3.6-flash",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    full_answer = ""
    for chunk in stream:
        if chunk.choices[0].delta.content:
            token = chunk.choices[0].delta.content
            full_answer += token
            yield token
    set_cached_key(
        organization_id=organization_id, question=question, answer=full_answer
    )
