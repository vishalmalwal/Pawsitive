from dotenv import load_dotenv
load_dotenv()
import os
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from openai import OpenAI
from jose import JWTError, jwt
from pydantic import BaseModel
openai_client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    # Add this if needed for project keys
    # project=os.getenv("OPENAI_PROJECT_ID")  # Get your Project ID from dashboard > Project settings
)
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)


app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
ALGORITHM = "HS256"

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

# JWT Dependency - Validates Supabase JWT
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("email_confirmed_at") is None:
            raise HTTPException(status_code=403, detail="Email not verified")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_embedding(text: str):
    response = openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# ... (keep the top part: imports, app, middleware, supabase, openai, JWT dependency)

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
        raise HTTPException(403, "Only shelters")
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

# Keep the other endpoints (compatibility-report, chat, care-roadmap, analytics) as before

@app.post("/compatibility-report")
async def compatibility_report(req: CompatibilityRequest, user = Depends(get_current_user)):
    pet = supabase.table("pets").select("*").eq("id", req.pet_id).single().execute().data
    profile = supabase.table("profiles").select("lifestyle_vector").eq("id", user["sub"]).single().execute().data
    # Retrieve raw text for better prompt
    lifestyle_text = "Active family with kids and yard"  # In real app, store raw text too
    prompt = f"""
    Explain why this pet might be a good match.
    User lifestyle: {lifestyle_text}
    Pet: {pet['name']}, {pet['species']}, traits: {pet['description']}
    Keep it positive, warm, and 3-4 sentences.
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
        context = f"Pet details: {pet['name']}, {pet['species']}, {pet['description']}"
    prompt = f"Question about pet adoption: {req.question}\nContext: {context}"
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
    # Simple match rate placeholder
    match_rate = 0.65  # Replace with real query later
    descriptions = "\n".join([p["description"] for p in pets[-5:]])
    prompt = f"Analyze these stagnant pet descriptions and suggest improvements:\n{descriptions}"
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"match_rate": match_rate, "suggestions": response.choices[0].message.content}