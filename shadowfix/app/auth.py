import logging
import bcrypt
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

# Minimal Mock User Data
MOCK_USERS = {
    "user@shadowfix.ai": {
        "username": "user",
        "hashed_password": get_password_hash("shadow_password_123"),
        "role": "user"
    },
    "admin@shadowfix.ai": {
        "username": "admin",
        "hashed_password": get_password_hash("admin_secure_99"),
        "role": "admin"
    }
}

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception
    
    user = MOCK_USERS.get(token_data.email)
    if user is None:
        raise credentials_exception
    return {"email": token_data.email, "role": user["role"]}

async def get_optional_user(request: Request):
    """
    Tiered Rate Limiting Guard.
    Manually extracts token to avoid framework-level 401s on optional auth.
    Supports both local mock JWTs and Clerk JWTs (via unverified claims for ID tracking).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.debug("No valid Authorization header found for optional auth.")
        return None
    
    token = auth_header.split(" ")[1]
    try:
        # 1. Try local verified decode (for mock users)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        user = MOCK_USERS.get(email)
        if user:
            logger.info("Authenticated via local JWT: %s", email)
            return {"email": email, "role": user["role"], "type": "mock_auth"}
    except JWTError:
        # 2. Try unverified extraction (for Clerk tokens) purely for rate-limit ID tracking
        try:
            payload = jwt.get_unverified_claims(token)
            # Clerk tokens usually have 'email' or 'sub'
            email = payload.get("email") or payload.get("sub")
            if email:
                logger.info("Recognized Guest/Clerk Identity: %s", email)
                return {"email": email, "role": "user", "type": "guest_auth"}
        except:
            logger.warning("Malformed token provided in optional auth.")
    
    return None

async def check_admin_role(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user
