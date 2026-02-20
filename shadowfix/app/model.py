import logging
import io
import requests
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

# Model for still images: SigLIP (SOTA AI detector)
MODEL_ID = "Ateeqq/ai-vs-human-image-detector"
API_URL = f"https://api-inference.huggingface.co/models/{MODEL_ID}"

def predict_image(image: Image.Image) -> float:
    """Hybrid Inference: Tries Cloud API first, falls back to Local Model if available."""
    
    # 1. Try Cloud Inference API (Fastest if model is warm)
    headers = {
        "Authorization": f"Bearer {settings.HF_API_TOKEN}",
        "Content-Type": "image/jpeg"
    }
    
    img_byte_arr = io.BytesIO()
    if image.mode != "RGB":
        image = image.convert("RGB")
    image.save(img_byte_arr, format='JPEG')
    data = img_byte_arr.getvalue()

    urls = [
        API_URL,
        f"https://api-inference.huggingface.co/pipeline/image-classification/{MODEL_ID}"
    ]
    
    for url in urls:
        try:
            logger.info("Attempting Cloud Inference at %s", url)
            response = requests.post(url, headers=headers, data=data, timeout=12)
            if response.status_code == 200:
                results = response.json()
                for item in results:
                    label = item.get("label", "").lower()
                    if any(kw in label for kw in ("fake", "ai", "artificial", "generated")):
                        return float(item["score"])
                return float(results[0]["score"])
            logger.warning("Cloud Inference failed at %s (%s)", url, response.status_code)
        except Exception as e:
            logger.warning("Network error at %s: %s", url, e)

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
