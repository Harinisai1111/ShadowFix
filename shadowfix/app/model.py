import requests
import io
import logging
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

# Model Configuration
MODEL_ID = "umm-maybe/AI-image-detector"
API_URL = f"https://router.huggingface.co/hf-inference/models/{MODEL_ID}"

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
        logger.info("--- INF ENGINE RAW DATA ---")
        logger.info(results)
        logger.info("---------------------------")
        
        # 5. Parse Results with Simple Logic (Original)
        if not results or not isinstance(results, list):
            raise ValueError(f"Invalid API response style: {results}")

        FAKE_KEYWORDS = ("fake", "ai", "artificial", "generated")
        REAL_KEYWORDS = ("real", "human", "authentic", "natural")
        
        # Try to find an explicit FAKE label first
        for item in results:
            label = item.get("label", "").lower()
            if any(kw in label for kw in FAKE_KEYWORDS):
                logger.info("Matched FAKE-positive label: %s (score: %f)", label, item["score"])
                return float(item["score"])
        
        # If no fake label found, check for REAL label to calculate (1 - real_score)
        for item in results:
            label = item.get("label", "").lower()
            if any(kw in label for kw in REAL_KEYWORDS):
                fake_prob = 1.0 - float(item["score"])
                logger.info("Matched REAL-negative label: %s (score: %f) -> Computed fake prob: %f", label, item["score"], fake_prob)
                return fake_prob
        
        # Fallback to the first result as a generic probability
        logger.warning("No forensic keywords matched. Falling back to primary result score.")
        return float(results[0]["score"])

    except Exception as e:
        logger.error("Direct Inference Error: %s", str(e), exc_info=True)
        raise ValueError(f"AI Engine Failure: {str(e)}")
