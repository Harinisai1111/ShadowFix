import logging
import os
import tempfile
import gc
import cv2
import requests
import io
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

# Video-specific model
VIDEO_MODEL_ID = "Dima806/deepfake_vs_real_image_detection"
API_URL = f"https://api-inference.huggingface.co/models/{VIDEO_MODEL_ID}"

def query_hf_api(image: Image.Image):
    """Internal helper for HF API frame classification."""
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
    
    response = requests.post(API_URL, headers=headers, data=buffered.getvalue(), timeout=10)
    response.raise_for_status()
    return response.json()

def temporary_video_file(video_bytes: bytes, suffix=".mp4"):
    """Privacy safe temporary file creation."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name
        yield tmp_path
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

def extract_frames(video_bytes: bytes, n=10, suffix=".mp4"):
    """Extracts frames with sampling logic."""
    frames = []
    # Usage of generator-like pattern for memory safety
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name
    
    try:
        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if fps > 0: total = min(total, int(5 * fps))
        if total <= 0: return []
        
        n = min(n, 10)
        indices = [int(i * (total / n)) for i in range(n)]
        
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(Image.fromarray(rgb))
        cap.release()
    finally:
        if os.path.exists(tmp_path): os.unlink(tmp_path)
        
    return frames

def predict_video(video_bytes: bytes, suffix=".mp4"):
    """Video forensic analysis using Cloud Inference API."""
    frames = extract_frames(video_bytes, suffix=suffix)
    if not frames:
        raise ValueError("Video forensic extraction failed.")
        
    scores = []
    try:
        for frame in frames:
            try:
                results = query_hf_api(frame)
                for item in results:
                    if "fake" in item["label"].lower():
                        scores.append(item["score"])
                        break
            except Exception as e:
                logger.error("Frame Inference Error: %s", e)
                continue
    finally:
        del frames
        gc.collect()
                
    if not scores: return {"overall_probability": 0.0}
    
    scores.sort()
    idx = int(len(scores) * 0.75)
    return {"overall_probability": scores[min(idx, len(scores)-1)]}
