import io
import logging
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

# Strict Whitelists
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}

def validate_image_file(filename: str, content_type: str, file_size: int):
    """Strictly validates image type (extension + MIME) and size."""
    # 1. Extension Check
    ext = f".{filename.split('.')[-1].lower()}" if "." in filename else ""
    if ext not in {".jpg", ".jpeg", ".png"}:
        raise ValueError("Invalid file extension. Only JPG, JPEG, PNG allowed.")
    
    # 2. MIME Check (Flexible for parameters like charset)
    if not any(content_type.startswith(t) for t in ALLOWED_IMAGE_TYPES):
        raise ValueError(f"Invalid MIME type: {content_type}. Access denied.")
    
    # 3. Size Check
    if file_size > settings.MAX_IMAGE_SIZE_BYTES:
        raise ValueError("File size exceeds allowed limit")

def validate_video_file(filename: str, content_type: str, file_size: int):
    """Strictly validates video type (extension + MIME) and size."""
    # 1. Extension Check
    ext = f".{filename.split('.')[-1].lower()}" if "." in filename else ""
    if ext not in {".mp4", ".webm"}:
        raise ValueError("Invalid file extension. Only MP4 and WebM allowed.")
    
    # 2. MIME Check (Flexible for parameters like codecs)
    if not any(content_type.startswith(t) for t in ALLOWED_VIDEO_TYPES):
        raise ValueError(f"Invalid MIME type: {content_type}. Access denied.")
    
    # 3. Size Check
    if file_size > settings.MAX_VIDEO_SIZE_BYTES:
        raise ValueError("File size exceeds allowed limit")

def bytes_to_pil(data: bytes) -> Image.Image:
    """Converts raw bytes to a PIL object IN-MEMORY."""
    try:
        return Image.open(io.BytesIO(data))
    except Exception as exc:
        logger.error("Failed to decode image: %s", exc)
        raise ValueError("Corrupted or invalid image data.")

def classify_risk(prob: float):
    """
    Forensic Risk Classification.
    Tuned for high sensitivity (Forensic Expert Mode).
    """
    if prob > 0.75:
        return "HIGH", True
    if prob >= 0.5:
        return "MEDIUM", False
    return "LOW", False
