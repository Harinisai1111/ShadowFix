import requests
import logging
import io
import os
import tempfile
import gc
import cv2
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

# Model Configuration
VIDEO_MODEL_ID = "umm-maybe/AI-image-detector"
VIDEO_API_URL = f"https://router.huggingface.co/hf-inference/models/{VIDEO_MODEL_ID}"

def query_hf_api(image: Image.Image):
    """Internal helper for HF API frame classification using direct requests."""
    
    # Aggressive Token Sanitization
    raw_token = settings.HF_API_TOKEN or ""
    sanitized_token = "".join(raw_token.split()).replace('"', '').replace("'", "")
    
    try:
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        
        logger.info("Requesting video frame inference for %s via direct HTTP POST", VIDEO_MODEL_ID)
        
        headers = {
            "Authorization": f"Bearer {sanitized_token}",
            "Content-Type": "image/jpeg"
        }
        
        response = requests.post(VIDEO_API_URL, headers=headers, data=buffered.getvalue())
        
        if response.status_code != 200:
            logger.error("Video Frame API Failed (%d): %s", response.status_code, response.text)
            return None
            
        results = response.json()
        logger.info("Video frame inference success.")
        return results
            
    except Exception as e:
        logger.error("Video Inference Error: %s", str(e), exc_info=True)
        return None

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
    """Hybrid Video Analysis: Cloud First, Local Fallback."""
    frames = extract_frames(video_bytes, suffix=suffix)
    if not frames:
        raise ValueError("Video forensic extraction failed.")
        
    scores = []
    use_local = False
    
    # Try Cloud for first frame to test connection
    try:
        test_res = query_hf_api(frames[0])
        # If we got here, cloud works
    except Exception as e:
        logger.warning("Video Cloud API blocked, attempting local fallback... Error: %s", e)
        use_local = True

    try:
        if use_local:
            from transformers import pipeline
            if not hasattr(predict_video, "_local_pipe"):
                predict_video._local_pipe = pipeline("image-classification", model=VIDEO_MODEL_ID)
            
            for frame in frames:
                results = predict_video._local_pipe(frame)
                for item in results:
                    if "fake" in item["label"].lower():
                        scores.append(item["score"])
                        break
        else:
            for frame in frames:
                try:
                    results = query_hf_api(frame)
                    for item in results:
                        if "fake" in item["label"].lower():
                            scores.append(item["score"])
                            break
                except Exception as e:
                    logger.error("Frame Cloud Error: %s", e)
                    continue
    except ImportError:
        raise ValueError("Video Inference Engine Failed. Cloud API check failed and 'transformers' not found for local fallback.")
    finally:
        del frames
        gc.collect()
                
    if not scores: return {"overall_probability": 0.0}
    
    scores.sort()
    idx = int(len(scores) * 0.75)
    return {"overall_probability": scores[min(idx, len(scores)-1)]}
