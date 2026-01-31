import os
import requests  # 👈 Added for AI API
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # 👈 Added for data validation

# Import your routers
from app.api import auth, records, abha 

# 👇 IMPORT DB CONNECTION FUNCTIONS
try:
    from app.db.mongodb import connect_to_mongo, close_mongo_connection
except ImportError:
    connect_to_mongo = None
    close_mongo_connection = None
    print("⚠️ WARNING: Could not import DB connection functions. Check app/db/mongodb.py")

app = FastAPI()

# --- CORS SETUP ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://hospital-management-qkd.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🧠 AI TRIAGE SECTION (New Feature)
# ==========================================

# 1. Get the Token from .env
HF_API_TOKEN = os.getenv("HF_TOKEN")

# 2. Define the Hugging Face Model URL (Zero-Shot Classification)
AI_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"

# 3. Define the Request Body
class DiagnosisRequest(BaseModel):
    diagnosis_text: str

@app.post("/api/predict-department", tags=["AI Triage"])
async def predict_department(request: DiagnosisRequest):
    """
    Takes patient symptoms and returns the suggested medical department.
    Uses Hugging Face Inference API (Serverless).
    """
    if not HF_API_TOKEN:
        return {"recommended_department": "AI Config Missing (Check .env)", "confidence": 0}

    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    
    # Departments the AI can choose from
    candidate_labels = [
        "Cardiology", 
        "Neurology", 
        "Orthopedics", 
        "General Medicine", 
        "Pediatrics", 
        "Dermatology", 
        "Psychiatry"
    ]

    payload = {
        "inputs": request.diagnosis_text,
        "parameters": {"candidate_labels": candidate_labels}
    }

    try:
        # Send text to Hugging Face API
        response = requests.post(AI_URL, headers=headers, json=payload)
        data = response.json()

        # Handle 'Model Loading' error (common on free tier)
        if "error" in data and "loading" in data["error"]:
            return {
                "recommended_department": "AI is warming up... try again in 10s",
                "confidence": 0
            }

        # Return the top prediction
        return {
            "recommended_department": data['labels'][0],
            "confidence": round(data['scores'][0] * 100, 1)
        }
    except Exception as e:
        print(f"AI Error: {e}")
        return {"recommended_department": "Manual Selection Needed", "confidence": 0}

# ==========================================

# --- LIFECYCLE EVENTS (Connect to DB on Startup) ---
@app.on_event("startup")
async def startup_db_client():
    if connect_to_mongo:
        await connect_to_mongo()
        print("✅ DATABASE CONNECTED via main.py")
    else:
        print("❌ DATABASE CONNECTION FAILED: Function not found")

@app.on_event("shutdown")
async def shutdown_db_client():
    if close_mongo_connection:
        await close_mongo_connection()
        print("🛑 DATABASE DISCONNECTED")

# --- CONNECT ROUTERS ---
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(records.router, prefix="/api/records", tags=["Medical Records"])
app.include_router(abha.router, prefix="/api/abha", tags=["ABHA Integration"])

@app.get("/")
def read_root():
    return {"status": "Backend is running", "module": "Hospital-System"}