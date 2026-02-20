import logging
import io
from PIL import Image
from huggingface_hub import InferenceClient
from app.config import settings

logger = logging.getLogger(__name__)

# Model for still images (Using a highly stable official client)
MODEL_ID = "dima806/deepfake_vs_real_image_detection"

def predict_image(image: Image.Image) -> float:
    """Uses official HF InferenceClient with AGGRESSIVE token sanitization."""
    
    # 1. Aggressive Token Sanitization (Removes all whitespace, quotes, and junk)
    raw_token = settings.HF_API_TOKEN or ""
    # "".join(raw_token.split()) removes ALL spaces, newlines, and tabs anywhere in the string
    sanitized_token = "".join(raw_token.split()).replace('"', '').replace("'", "")
    
    # EXTRA LOUD DIAGNOSTICS
    logger.info("***********************************************")
    if sanitized_token:
        safe_display = f"{sanitized_token[:6]}...{sanitized_token[-4:]}"
        is_hf_prefixed = sanitized_token.startswith("hf_")
        logger.info("HF_API_TOKEN: %s (Prefixed: %s, Length: %d)", safe_display, is_hf_prefixed, len(sanitized_token))
        if not is_hf_prefixed:
            logger.error("!!! WARNING: Token does NOT start with 'hf_'. It is likely INVALID.")
    else:
        logger.error("!!! CRITICAL: HF_API_TOKEN is EMPTY in settings!")
    logger.info("***********************************************")
    
    try:
        # 2. Initialize Client
        client = InferenceClient(model=MODEL_ID, token=sanitized_token)
        
        img_byte_arr = io.BytesIO()
        if image.mode != "RGB":
            image = image.convert("RGB")
        image.save(img_byte_arr, format='JPEG')
        
        logger.info("Requesting inference for %s with explicit Content-Type", MODEL_ID)
        
        # 3. Call API DIRECTLY with Content-Type header to fix the 400 error
        import json
        response = client.post(
            data=img_byte_arr.getvalue(),
            headers={"Content-Type": "image/jpeg"}
        )
        
        results = json.loads(response.decode())
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
