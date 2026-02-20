import requests
import io
import logging
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

# Model Configuration
MODEL_ID = "dima806/deepfake_vs_real_image_detection"
API_URL = f"https://api-inference.huggingface.co/models/{MODEL_ID}"

def predict_image(image: Image.Image) -> float:
    """Uses direct requests for maximum reliability and explicit header control."""
    
    # 1. Aggressive Token Sanitization
    raw_token = settings.HF_API_TOKEN or ""
    sanitized_token = "".join(raw_token.split()).replace('"', '').replace("'", "")
    
    # LOUD DIAGNOSTICS
    logger.info("***********************************************")
    if sanitized_token:
        safe_display = f"{sanitized_token[:6]}...{sanitized_token[-4:]}"
        logger.info("HF_API_TOKEN: %s (Length: %d)", safe_display, len(sanitized_token))
    else:
        logger.error("!!! CRITICAL: HF_API_TOKEN is EMPTY!")
    logger.info("***********************************************")
    
    try:
        # 2. Prepare Binary Payload
        img_byte_arr = io.BytesIO()
        if image.mode != "RGB":
            image = image.convert("RGB")
        image.save(img_byte_arr, format='JPEG')
        
        logger.info("Requesting inference for %s via direct HTTP POST", MODEL_ID)
        
        # 3. Direct API Call with explicit headers to prevent 400 errors
        headers = {
            "Authorization": f"Bearer {sanitized_token}",
            "Content-Type": "image/jpeg"
        }
        
        response = requests.post(API_URL, headers=headers, data=img_byte_arr.getvalue())
        
        # 4. Handle Response
        if response.status_code != 200:
            error_msg = response.text
            logger.error("API Request Failed (%d): %s", response.status_code, error_msg)
            raise ValueError(f"Hugging Face API Error ({response.status_code}): {error_msg}")

        results = response.json()
        logger.info("Inference Results: %s", results)
        
        # 5. Parse Results
        if not results or not isinstance(results, list):
            raise ValueError(f"Invalid API response style: {results}")

        for item in results:
            label = item.get("label", "").lower()
            if any(kw in label for kw in ("fake", "ai", "artificial", "generated")):
                return float(item["score"])
        
        return float(results[0]["score"])

    except Exception as e:
        logger.error("Direct Inference Error: %s", str(e), exc_info=True)
        raise ValueError(f"AI Engine Failure: {str(e)}")
