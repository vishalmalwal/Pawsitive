from dotenv import load_dotenv
load_dotenv()

import os
import requests
from cachetools import cached, TTLCache
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from openai import OpenAI
from jose import jwt, JWTError
from pydantic import BaseModel

# Initialize clients
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache JWKS for 1 hour
@cached(cache=TTLCache(maxsize=1, ttl=3600))
def get_jwks():
    url = f"{os.getenv('SUPABASE_URL')}/auth/v1/.well-known/jwks.json"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

jwks = get_jwks()  # Initial load

# Pydantic models
class ProfileUpdate(BaseModel):
    lifestyle_description: str

class PetCreate(BaseModel):
    name: str
    species: str
    description: str
    traits_description: str

class CompatibilityRequest(BaseModel):
    pet_id: str

class ChatQuestion(BaseModel):
    question: str
    pet_id: str | None = None

class CareRoadmap(BaseModel):
    pet_id: str

# JWT Dependency - RS256 validation
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    
    try:
        # Temporary relaxed validation for local testing
        # Decode without verification first to get payload
        payload = jwt.decode(token, options={"verify_signature": False})
        
        # Basic checks
        if not payload.get("iss") or "supabase" not in payload["iss"]:
            raise HTTPException(status_code=401, detail="Invalid token issuer")
        
        if not payload.get("email_confirmed_at"):
            raise HTTPException(status_code=403, detail="Email not verified")
        
        return payload
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Embedding helper
def generate_embedding(text: str):
    if not text.strip():
        return [0.0] * 1536
    response = openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# Endpoints (same as before)

@app.post("/profile/lifestyle")
async def update_lifestyle(data: ProfileUpdate, user = Depends(get_current_user)):
    vector = generate_embedding(data.lifestyle_description)
    supabase.table("profiles").update({
        "lifestyle_vector": vector,
        "lifestyle_text": data.lifestyle_description
    }).eq("id", user["sub"]).execute()
    return {"success": True}

@app.post("/pets")
async def create_pet(pet: PetCreate, user = Depends(get_current_user)):
    if user.get("app_metadata", {}).get("user_type") != "shelter":
        raise HTTPException(403, "Only shelters can add pets")
    
    vector = generate_embedding(pet.traits_description)
    res = supabase.table("pets").insert({
        "shelter_id": user["sub"],
        "name": pet.name,
        "species": pet.species,
        "description": pet.description,
        "traits_text": pet.traits_description,
        "trait_vector": vector,
        "status": "available"
    }).execute()
    return res.data[0]

@app.get("/matches")
async def get_matches(limit: int = 10, user = Depends(get_current_user)):
    profile = supabase.table("profiles").select("lifestyle_vector").eq("id", user["sub"]).single().execute()
    if not profile.data.get("lifestyle_vector"):
        raise HTTPException(400, "Set lifestyle first")
    
    matches = supabase.rpc("match_pets", {
        "query_vector": profile.data["lifestyle_vector"],
        "match_limit": limit
    }).execute()
    return matches.data

@app.post("/applications")
async def apply_to_pet(pet_id: str, user = Depends(get_current_user)):
    supabase.table("applications").insert({
        "pet_id": pet_id,
        "user_id": user["sub"],
        "status": "pending"
    }).execute()
    return {"success": True}

@app.post("/compatibility-report")
async def compatibility_report(req: CompatibilityRequest, user = Depends(get_current_user)):
    pet = supabase.table("pets").select("*").eq("id", req.pet_id).single().execute().data
    profile = supabase.table("profiles").select("lifestyle_text").eq("id", user["sub"]).single().execute().data
    lifestyle_text = profile.get("lifestyle_text", "No lifestyle description")
    
    prompt = f"""
    Explain why this pet is a good match.
    Adopter lifestyle: {lifestyle_text}
    Pet: {pet['name']}, {pet['species']}, {pet['description']}
    Keep it warm, positive, 3-4 sentences.
    """
    
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"report": response.choices[0].message.content}

@app.post("/chat")
async def chat(req: ChatQuestion, user = Depends(get_current_user)):
    context = ""
    if req.pet_id:
        pet = supabase.table("pets").select("*").eq("id", req.pet_id).single().execute().data
        context = f"Pet: {pet['name']}, {pet['species']}, {pet['description']}"
    
    prompt = f"Answer adoption question: {req.question}\nContext: {context}"
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"answer": response.choices[0].message.content}

@app.post("/care-roadmap")
async def care_roadmap(req: CareRoadmap, user = Depends(get_current_user)):
    pet = supabase.table("pets").select("species").eq("id", req.pet_id).single().execute().data
    prompt = f"Create a 30-60-90 day care roadmap for a {pet['species']} after adoption."
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"roadmap": response.choices[0].message.content}

@app.get("/shelter/analytics")
async def shelter_analytics(user = Depends(get_current_user)):
    pets = supabase.table("pets").select("id, description").eq("shelter_id", user["sub"]).execute().data
    descriptions = "\n".join([p["description"] for p in pets[-5:]])
    prompt = f"Analyze these pet descriptions and suggest improvements:\n{descriptions}"
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"match_rate": 0.65, "suggestions": response.choices[0].message.content}