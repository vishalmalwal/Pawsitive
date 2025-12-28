import os
from pathlib import Path
from dotenv import load_dotenv

from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from supabase import create_client

# -------------------------------------------------
# Load environment variables
# -------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")

if not SUPABASE_URL or not SUPABASE_KEY or not JWT_SECRET:
    raise RuntimeError("Missing required environment variables")

# -------------------------------------------------
# Supabase client
# -------------------------------------------------
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------------------------------------------
# JWT security
# -------------------------------------------------
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Validates Supabase JWT from Authorization header.
    Returns decoded JWT payload.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )
