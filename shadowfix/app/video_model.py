import logging
import os
import tempfile
import statistics
from functools import lru_cache
from contextlib import contextmanager

import gc
import cv2
from PIL import Image
from transformers import pipeline

logger = logging.getLogger(__name__)

# Video-specific model
VIDEO_MODEL_ID = "Dima806/deepfake_vs_real_image_detection"

@lru_cache(maxsize=1)
def _get_video_pipeline():
    logger.info("Initializing Video Forensic Pipeline...")
    return pipeline("image-classification", model=VIDEO_MODEL_ID, device=-1)

@contextmanager
def temporary_video_file(video_bytes: bytes, suffix=".mp4"):
    """
    Zero-Retention Helper:
    Writes bytes to a temp file for OpenCV, then GUARANTEES removal.
    """
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name
        yield tmp_path
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
                logger.debug("Privacy safe: Temporary video unlinked.")
            except Exception as e:
                logger.error("Failed to unlink temp video: %s", e)

def extract_frames(video_bytes: bytes, n=10, suffix=".mp4"):
    """Extracts frames with a 5-second and 10-frame limit for stability."""
    frames = []
    with temporary_video_file(video_bytes, suffix=suffix) as path:
        cap = cv2.VideoCapture(path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Limit processing to first 5 seconds
        if fps > 0:
            total = min(total, int(5 * fps))
            
        if total <= 0: return []
        
        # Sample maximum 10 frames
        n = min(n, 10)
        indices = [int(i * (total / n)) for i in range(n)]
        
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(Image.fromarray(rgb))
        cap.release()
    return frames

def predict_video(video_bytes: bytes, suffix=".mp4"):
    """Video inference with auto-cleanup and memory safety."""
    clf = _get_video_pipeline()
    frames = extract_frames(video_bytes, suffix=suffix)
    
    if not frames:
        raise ValueError("Video forensic extraction failed. Corrupted video or invalid format.")
        
    scores = []
    try:
        for frame in frames:
            results = clf(frame)
            for item in results:
                if "fake" in item["label"].lower():
                    scores.append(item["score"])
                    break
            # Micro cleanup
            del results
    finally:
        # Explicitly release large frame data
        del frames
        gc.collect()
                
    if not scores: return {"overall_probability": 0.0}
    
    # 75th percentile for robustness
    scores.sort()
    idx = int(len(scores) * 0.75)
    return {"overall_probability": scores[min(idx, len(scores)-1)]}
