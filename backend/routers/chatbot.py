from fastapi import APIRouter, Depends
from deps import get_current_user

router = APIRouter()

@router.post("/")
def chatbot(user=Depends(get_current_user)):
    return {"message": "Chatbot response"}
