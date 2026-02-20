from huggingface_hub import InferenceClient
from app.config import settings

logger = logging.getLogger(__name__)

# Sanitized Token
HF_TOKEN = settings.HF_API_TOKEN.strip() if settings.HF_API_TOKEN else ""

# Model for still images (Using a highly stable official client)
MODEL_ID = "dima806/deepfake_vs_real_image_detection"

def predict_image(image: Image.Image) -> float:
    """Uses official HF InferenceClient for high reliability."""
    
    if not HF_TOKEN:
        logger.warning("HF_API_TOKEN is missing!")
    
    try:
        client = InferenceClient(model=MODEL_ID, token=HF_TOKEN)
        
        img_byte_arr = io.BytesIO()
        if image.mode != "RGB":
            image = image.convert("RGB")
        image.save(img_byte_arr, format='JPEG')
        
        logger.info("Requesting inference for %s via InferenceClient", MODEL_ID)
        
        # InferenceClient.image_classification handles everything (URL, headers, binary data)
        results = client.image_classification(img_byte_arr.getvalue())
        
        logger.info("Inference Results: %s", results)
        
        # Safety parse
        if not results or not isinstance(results, list):
            raise ValueError(f"Invalid API response style: {results}")

        for item in results:
            label = item.get("label", "").lower()
            if any(kw in label for kw in ("fake", "ai", "artificial", "generated")):
                return float(item["score"])
        
        # Fallback to the first result's score if no keywords match
        return float(results[0]["score"])

    except Exception as e:
        logger.error("Inference Error (InferenceClient): %s", str(e), exc_info=True)
        raise ValueError(f"AI Engine Error: {str(e)}")
