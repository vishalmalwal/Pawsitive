from fastapi import APIRouter, Depends
from deps import get_current_user

router = APIRouter()

@router.post("/secure")
def secure_endpoint(user=Depends(get_current_user)):
    """
    Test endpoint to verify JWT authentication.
    """
    user_id = user["sub"]  # Supabase user ID

    return {
        "message": "You are authenticated",
        "user_id": user_id,
    }
