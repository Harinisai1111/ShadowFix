import logging
import io
from functools import lru_cache
from typing import Tuple

import torch
from PIL import Image
from transformers import pipeline

logger = logging.getLogger(__name__)

# Model for still images: SigLIP (SOTA AI detector)
MODEL_ID = "Ateeqq/ai-vs-human-image-detector"

@lru_cache(maxsize=1)
def _get_pipeline():
    """Load and cache the pipeline on CPU."""
    logger.info("Initializing Zero-Retention Signature Model...")
    return pipeline("image-classification", model=MODEL_ID, device=-1)

def predict_image(image: Image.Image) -> float:
    """Runs inference in-memory."""
    clf = _get_pipeline()
    
    if image.mode != "RGB":
        image = image.convert("RGB")
        
    results = clf(image)
    
    # Process results strictly in memory
    for item in results:
        label = item.get("label", "").lower()
        if any(kw in label for kw in ("fake", "ai", "artificial", "generated")):
            return float(item["score"])
            
    return float(results[0]["score"])
