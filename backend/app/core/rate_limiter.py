from functools import wraps
from redis import Redis
from fastapi import HTTPException
from app.config import settings


redis_conn = Redis.from_url(settings.redis_url)


def check_rate_limit(user_id: int, limit: int = 10, window_seconds: int = 60) -> bool:
    key = f"rate_limit:{user_id}"
    with redis_conn.pipeline() as pipe:
        pipe.incr(key)
        pipe.ttl(key)
        current, ttl = pipe.execute()

    if ttl == -1:
        redis_conn.expire(key, window_seconds)
    return current <= limit


def rate_limit(limit: int = 10, window_seconds: int = 60):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            if current_user is None:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required for this endpoint",
                )

            allowed = check_rate_limit(current_user.id, limit, window_seconds)
            if not allowed:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            return await func(*args, **kwargs)

        return wrapper

    return decorator


def check_rate_limit_by_key(key: str, limit: int, window_seconds: int) -> bool:
    """Rate limit by arbitrary string key (e.g. identifier, IP)."""
    with redis_conn.pipeline() as pipe:
        pipe.incr(key)
        pipe.ttl(key)
        current, ttl = pipe.execute()
    if ttl == -1:
        redis_conn.expire(key, window_seconds)
    return current <= limit
