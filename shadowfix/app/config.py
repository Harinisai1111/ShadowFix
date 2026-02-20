import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "SHADOWFIX"
    VERSION: str = "2.0.0"
    DEBUG: bool = False
    
    # Security Config
    # Generate a secure key for production: openssl rand -hex 32
    SECRET_KEY: str = os.getenv("SECRET_KEY", "7d4a5b4e2f3c1a9d8e7f6b5a4d3c2b1a0f9e8d7c6b5a4d3c2b1a0f9e8d7c6b5a")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # API Key for M2M integrations
    X_API_KEY: str = os.getenv("X_API_KEY", "shadowfix_internal_key_v2")
    HF_API_TOKEN: str = os.getenv("HF_API_TOKEN", "")
    
    # Rate Limiting
    RATE_LIMIT_AUTH: str = "10 per minute"
    RATE_LIMIT_GUEST: str = "5 per minute"
    
    # File Limits
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB
    MAX_VIDEO_SIZE_BYTES: int = 25 * 1024 * 1024 # 25MB
    
    # Allowed Types
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".mp4", ".webm"}
    ALLOWED_MIME_TYPES: set = {"image/jpeg", "image/png", "video/mp4", "video/webm"}
    
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
