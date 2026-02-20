from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

# Global rate limiter setup
limiter = Limiter(key_func=get_remote_address)

def _custom_rate_limit_exceeded_handler(request, exc):
    """Returns structured JSON error for rate limiting."""
    return JSONResponse(
        status_code=429,
        content={"error": "Too Many Requests"}
    )

def init_app_limiter(app):
    """Register limiter with the FastAPI app."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _custom_rate_limit_exceeded_handler)
