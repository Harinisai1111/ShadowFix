import asyncio
import gc
import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile, status, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth import (
    create_access_token, 
    get_current_user, 
    get_optional_user,
    check_admin_role,
    Token,
    MOCK_USERS,
    verify_password
)
from app.security import validate_api_key, add_security_headers, api_key_header
from app.rate_limiter import init_app_limiter, limiter
from app.model import predict_image
from app.video_model import predict_video
from app.utils import (
    bytes_to_pil,
    classify_risk,
    validate_image_file,
    validate_video_file
)

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from slowapi.util import get_remote_address

# --- Rate Limit Keys ---
def auth_key_func(request: Request):
    """Returns Authorization header as key if present."""
    return request.headers.get("Authorization")

def guest_key_func(request: Request):
    """Returns IP as key ONLY for guests (no Auth header)."""
    if request.headers.get("Authorization"):
        return None  # Skip this limit for auth users
    return get_remote_address(request)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Wait for readiness."""
    logger.info("Initializing SHADOWFIX Featherweight Suite...")
    yield
    logger.info("SHADOWFIX shutting down securely.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# --- Middlewares & Security ---

# 1. Global Request Logger
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("Incoming: %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("Outgoing: %s (Status %s)", request.url.path, response.status_code)
    return response

# 2. Rate Limiting
init_app_limiter(app)

# 3. CORS Setup (Outermost Layer)
# Added last to ensure it's the first to handle requests and last to handle responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://shadow-fix.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Standardized Error Handling ---
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Specific handler for validation or data errors (400)."""
    logger.warning("Validation Error: %s", str(exc))
    return JSONResponse(
        status_code=400,
        content={"error": str(exc)}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Specific handler for HTTP exceptions."""
    logger.error("HTTP Exception [%s]: %s", exc.status_code, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
        headers=exc.headers
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled Internal Error: %s", traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": "An internal server error occurred."}
    )

# --- Endpoints ---

@app.post("/login", response_model=Token, tags=["Auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Standard JWT Login. 
    Use user@shadowfix.ai / shadow_password_123
    """
    user = MOCK_USERS.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": form_data.username, "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/analyze-image", tags=["Analysis"])
@limiter.limit(settings.RATE_LIMIT_AUTH, key_func=auth_key_func)
@limiter.limit(settings.RATE_LIMIT_GUEST, key_func=guest_key_func)
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_optional_user),
):
    """Forensic Image Analysis with timeout and memory protection."""
    validate_image_file(file.filename or "unknown.jpg", file.content_type, file.size)
    user_email = current_user.get("email") if current_user else "GUEST_IP_" + (request.client.host if request.client else "UNKNOWN")
    logger.info("Image analysis request by %s", user_email)
    
    content = None
    pil_img = None
    try:
        content = await file.read()
        pil_img = bytes_to_pil(content)
        
        # 120s Inference Timeout (Allow for local model loading)
        probability = await asyncio.wait_for(
            asyncio.to_thread(predict_image, pil_img),
            timeout=120.0
        )
        
        risk, flag = classify_risk(probability)
        return {
            "verdict": "FAKE" if flag else "REAL",
            "probability": round(probability, 4),
            "risk_level": risk,
            "security_note": "Zero-retention: media discarded."
        }
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Processing timeout")
    finally:
        # Explicit Memory Cleanup
        if content: del content
        if pil_img: del pil_img
        await file.close()
        gc.collect()

@app.post("/analyze-video", tags=["Analysis"])
@limiter.limit(settings.RATE_LIMIT_AUTH, key_func=auth_key_func)
@limiter.limit(settings.RATE_LIMIT_GUEST, key_func=guest_key_func)
async def analyze_video(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_optional_user)
):
    """Forensic Video Analysis with timeout and memory protection."""
    validate_video_file(file.filename or "unknown.mp4", file.content_type, file.size)
    user_email = current_user.get("email") if current_user else "GUEST_IP_" + (request.client.host if request.client else "UNKNOWN")
    logger.info("Video analysis request by %s", user_email)
    
    # Extract suffix for OpenCV
    suffix = ".mp4"
    if file.filename and file.filename.endswith(".webm"):
        suffix = ".webm"
    
    content = None
    try:
        content = await file.read()
        
        # 120s Inference Timeout (Allow for local model loading)
        result = await asyncio.wait_for(
            asyncio.to_thread(predict_video, content, suffix=suffix),
            timeout=120.0
        )
        
        risk, flag = classify_risk(result["overall_probability"])
        return {
            "verdict": "FAKE" if flag else "REAL",
            "probability": round(result["overall_probability"], 4),
            "risk_level": risk,
            "security_note": "Zero-retention: media discarded."
        }
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Processing timeout")
    finally:
        if content: del content
        await file.close()
        gc.collect()

@app.get("/admin/metrics", tags=["Admin"])
async def get_metrics(admin: dict = Depends(check_admin_role)):
    """Admin-only system status."""
    return {
        "status": "Healthy",
        "cpu_usage": "Static Load",
        "zero_retention_active": True
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "SHADOWFIX-SECURE"}
