from redis import Redis
from app.config import settings
from rq import Queue


redis_conn = Redis.from_url(settings.redis_url)

document_queue = Queue(name="document", connection=redis_conn)
