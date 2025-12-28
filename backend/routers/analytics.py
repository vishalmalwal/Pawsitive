from fastapi import APIRouter, Depends
from deps import get_current_user

router = APIRouter()

@router.get("/")
def analytics(user=Depends(get_current_user)):
    return {"message": "Analytics data"}
