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
AI_URL = "https://router.huggingface.co/models/facebook/bart-large-mnli"

# 3. Define the Request Body
class DiagnosisRequest(BaseModel):
    diagnosis_text: str

@app.post("/api/predict-department", tags=["AI Triage"])
async def predict_department(request: DiagnosisRequest):
    """
    Takes patient symptoms and returns the suggested medical department.
    Uses Hugging Face Inference API (Serverless).
    """
    # 1. Check if token exists
    if not HF_API_TOKEN:
        return {"recommended_department": "Error: HF_TOKEN missing in .env", "confidence": 0}

    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    
    candidate_labels = [
        "Cardiology", "Neurology", "Orthopedics", "General Medicine", 
        "Pediatrics", "Dermatology", "Psychiatry"
    ]

    payload = {
        "inputs": request.diagnosis_text,
        "parameters": {"candidate_labels": candidate_labels}
    }

    try:
        response = requests.post(AI_URL, headers=headers, json=payload)
        data = response.json()

        # 🔍 DEBUG: Print the raw response to logs
        print(f"🔍 HF RESPONSE: {data}")

        # 2. CATCH API ERRORS (The missing piece!)
        # If Hugging Face returns an error, show it to the user instead of crashing
        if "error" in data:
            error_msg = data["error"]
            
            # Common case: Model is loading
            if "loading" in str(error_msg).lower():
                return {"recommended_department": "AI is warming up... try again in 10s", "confidence": 0}
            
            # Common case: Bad Token
            return {"recommended_department": f"HF Error: {error_msg}", "confidence": 0}

        # 3. Success!
        return {
            "recommended_department": data['labels'][0],
            "confidence": round(data['scores'][0] * 100, 1)
        }

    except Exception as e:
        # If code crashes (e.g., internet down), show the Python error
        print(f"❌ CRITICAL ERROR: {e}")
        return {"recommended_department": f"Backend Error: {str(e)}", "confidence": 0}

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