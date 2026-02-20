import logging
import io
import requests
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

# Model for still images: prithivMLmods (Highly stable on HF Inference API)
MODEL_ID = "prithivMLmods/Deep-Fake-Detector-Model"
API_URL = f"https://api-inference.huggingface.co/models/{MODEL_ID}"

def predict_image(image: Image.Image) -> float:
    """Hybrid Inference: Tries Cloud API first, falls back to Local Model if available."""
    
    # Check for token (Safety Log)
    if not settings.HF_API_TOKEN:
        logger.warning("HF_API_TOKEN is missing! Inference may be restricted.")
    else:
        logger.info("HF_API_TOKEN is present (Length: %d)", len(settings.HF_API_TOKEN))

    # 1. Try Cloud Inference API
    headers = {
        "Authorization": f"Bearer {settings.HF_API_TOKEN}",
        "Content-Type": "image/jpeg"
    }
    
    img_byte_arr = io.BytesIO()
    if image.mode != "RGB":
        image = image.convert("RGB")
    image.save(img_byte_arr, format='JPEG')
    data = img_byte_arr.getvalue()

    urls = [API_URL]
    
    for url in urls:
        try:
            logger.info("Attempting Cloud Inference at %s", url)
            response = requests.post(url, headers=headers, data=data, timeout=15)
            
            if response.status_code == 200:
                results = response.json()
                logger.info("Cloud Inference Success. Result: %s", results)
                # Parse results (Expected format: list of dicts with label/score)
                for item in results:
                    label = item.get("label", "").lower()
                    if any(kw in label for kw in ("fake", "ai", "artificial", "generated")):
                        return float(item["score"])
                return float(results[0]["score"])
            
            logger.error("Cloud Inference Failed. URL: %s, Status: %d, Response: %s", 
                         url, response.status_code, response.text[:500])
        except Exception as e:
            logger.error("Network error during inference at %s: %s", url, e)

    # 2. Fallback to Local Model (If transformers is installed)
    logger.info("Cloud Inference unavailable. Attempting Local fallback for %s...", MODEL_ID)
    try:
        from transformers import pipeline
        # Use a function-level local cache to avoid memory leak on every call
        if not hasattr(predict_image, "_local_pipe"):
            logger.info("Loading Local Weights (this may take time)...")
            predict_image._local_pipe = pipeline("image-classification", model=MODEL_ID)
        
        results = predict_image._local_pipe(image)
        for item in results:
            label = item.get("label", "").lower()
            if any(kw in label for kw in ("fake", "ai", "artificial", "generated")):
                return float(item["score"])
        return float(results[0]["score"])
    except ImportError:
        logger.error("Local fallback failed: 'transformers' not installed.")
        raise ValueError(f"Inference unreachable. Cloud API (410/400) failed and 'transformers' missing.")
    except Exception as e:
        logger.error("Local model error: %s", e)
        raise ValueError(f"Forensic engine totally blocked. Cloud API failed and Local model errored: {e}")
