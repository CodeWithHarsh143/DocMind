import hashlib
from redis import Redis
from app.config import settings


redis_conn = Redis.from_url(settings.redis_url)


def get_cached_key(organization_id: int, question: str) -> str:
    normalized = question.strip().lower()
    hash_value = hashlib.sha256(normalized.encode()).hexdigest()
    return f"chat_cache:{organization_id}:{hash_value}"


def get_cached_answer(organization_id: int, question: str) -> str | None:
    key = get_cached_key(organization_id=organization_id, question=question)
    cached = redis_conn.get(key)
    if cached:
        return cached.decode()
    return None


def set_cached_key(organization_id: int, question: str, answer: str):
    key = get_cached_key(organization_id, question)
    redis_conn.set(key, answer, ex=3600)
