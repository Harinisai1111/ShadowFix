import logging
import io
from PIL import Image
from huggingface_hub import InferenceClient
from app.config import settings

logger = logging.getLogger(__name__)

# Model for still images (Using a highly stable official client)
MODEL_ID = "dima806/deepfake_vs_real_image_detection"

def predict_image(image: Image.Image) -> float:
    """Uses official HF InferenceClient with strict token sanitization."""
    
    # 1. Robust Token Sanitization (Removes quotes, whitespace, and hidden garbage)
    raw_token = settings.HF_API_TOKEN or ""
    sanitized_token = raw_token.strip().replace('"', '').replace("'", "")
    
    if sanitized_token:
        # Safe logging for debugging format issues
        safe_display = f"{sanitized_token[:4]}...{sanitized_token[-4:]}"
        logger.info("HF_API_TOKEN sanitized: %s (Length: %d)", safe_display, len(sanitized_token))
    else:
        logger.warning("HF_API_TOKEN is MISSING or EMPTY!")
    
    try:
        # 2. Initialize Client
        client = InferenceClient(model=MODEL_ID, token=sanitized_token)
        
        img_byte_arr = io.BytesIO()
        if image.mode != "RGB":
            image = image.convert("RGB")
        image.save(img_byte_arr, format='JPEG')
        
        logger.info("Requesting inference for %s via InferenceClient", MODEL_ID)
        
        # 3. Call API
        results = client.image_classification(img_byte_arr.getvalue())
        
        logger.info("Inference Results: %s", results)
        
        # 4. Parse Results
        if not results or not isinstance(results, list):
            raise ValueError(f"Invalid API response style: {results}")

        for item in results:
            label = item.get("label", "").lower()
            if any(kw in label for kw in ("fake", "ai", "artificial", "generated")):
                return float(item["score"])
        
        return float(results[0]["score"])

    except Exception as e:
        logger.error("Inference Error (InferenceClient): %s", str(e), exc_info=True)
        raise ValueError(f"AI Engine Error: {str(e)}")
