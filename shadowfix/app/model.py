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
    """Runs inference via Hugging Face API."""
    if not settings.HF_API_TOKEN:
        logger.warning("HF_API_TOKEN not set. Inference might fail or be rate-limited.")
    
    headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
    
    # Pre-process image to bytes
    img_byte_arr = io.BytesIO()
    if image.mode != "RGB":
        image = image.convert("RGB")
    image.save(img_byte_arr, format='JPEG')
    data = img_byte_arr.getvalue()

    try:
        response = requests.post(API_URL, headers=headers, data=data, timeout=10)
        response.raise_for_status()
        results = response.json()
        
        # Process results from HF API
        for item in results:
            label = item.get("label", "").lower()
            if any(kw in label for kw in ("fake", "ai", "artificial", "generated")):
                return float(item["score"])
        
        return float(results[0]["score"])
    except Exception as exc:
        logger.error("HF API Inference Failed: %s", exc)
        raise ValueError(f"Inference Engine Error: {str(exc)}")
