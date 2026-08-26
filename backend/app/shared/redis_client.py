import logging
from typing import Optional
import redis.asyncio as aioredis
from app.config import get_settings

logger = logging.getLogger("aerostake.redis")
settings = get_settings()

_redis_client: Optional[aioredis.Redis] = None


def get_redis_client() -> aioredis.Redis:
    """Return the global async Redis client singleton instance."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2.0,
            socket_timeout=2.0,
        )
    return _redis_client


async def ping_redis() -> bool:
    """Health check ping returning True if Redis responds with PONG."""
    try:
        client = get_redis_client()
        return await client.ping()
    except Exception as e:
        logger.warning(f"Redis ping failed: {e}")
        return False


async def close_redis() -> None:
    """Gracefully close the global Redis connection pool."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
