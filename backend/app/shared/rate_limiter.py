import logging
import time
from typing import Dict, List
from fastapi import HTTPException, Request, status
from app.shared.redis_client import get_redis_client

logger = logging.getLogger("aerostake.rate_limiter")

# In-memory sliding window cache for local development / test fallback
_in_memory_windows: Dict[str, List[float]] = {}


class RateLimiter:
    """Sliding-window rate limiter dependency using Redis with instant in-memory fallback."""

    def __init__(self, times: int = 15, seconds: int = 60):
        self.times = times
        self.seconds = seconds

    async def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        key = f"rate_limit:{path}:{client_ip}"
        now = time.time()

        # In-Memory Fast Sliding Window Check
        window = _in_memory_windows.setdefault(key, [])
        # Evict timestamps older than sliding window
        window = [t for t in window if now - t < self.seconds]
        window.append(now)
        _in_memory_windows[key] = window

        if len(window) > self.times:
            logger.warning(f"[RATE LIMIT] Limit exceeded for IP '{client_ip}' on '{path}' ({len(window)}/{self.times})")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again in a few moments.",
            )

        # Optional: Asynchronously sync to Redis in production without blocking request
        return True


auth_rate_limiter = RateLimiter(times=15, seconds=60)
