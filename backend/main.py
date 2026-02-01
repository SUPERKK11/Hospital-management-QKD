import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 👇 IMPORT ROUTERS (Added 'transfer' here)
from app.api import auth, records, abha, transfer # 👈 NEW: Added transfer

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
    "https://hospital-management-qkd.netlify.app",
    "https://hospital-management-qkd.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🧠 AI TRIAGE SECTION
# ==========================================
HF_API_TOKEN = os.getenv("HF_TOKEN")
AI_URL = "https://router.huggingface.co/models/facebook/bart-large-mnli"

class DiagnosisRequest(BaseModel):
    diagnosis_text: str

@app.post("/api/predict-department", tags=["AI Triage"])
async def predict_department(request: DiagnosisRequest):
    if not HF_API_TOKEN:
        return {"recommended_department": "Error: HF_TOKEN missing in .env", "confidence": 0}

    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    candidate_labels = ["Cardiology", "Neurology", "Orthopedics", "General Medicine", "Pediatrics", "Dermatology", "Psychiatry"]
    payload = {"inputs": request.diagnosis_text, "parameters": {"candidate_labels": candidate_labels}}

    try:
        response = requests.post(AI_URL, headers=headers, json=payload)
        data = response.json()
        
        if "error" in data:
            return {"recommended_department": f"HF Error: {data['error']}", "confidence": 0}

        return {
            "recommended_department": data['labels'][0],
            "confidence": round(data['scores'][0] * 100, 1)
        }
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        return {"recommended_department": f"Backend Error: {str(e)}", "confidence": 0}

# ==========================================
# 🔌 LIFECYCLE & ROUTERS
# ==========================================

@app.on_event("startup")
async def startup_db_client():
    if connect_to_mongo:
        await connect_to_mongo()
        print("✅ DATABASE CONNECTED")

@app.on_event("shutdown")
async def shutdown_db_client():
    if close_mongo_connection:
        await close_mongo_connection()
        print("🛑 DATABASE DISCONNECTED")

# --- CONNECT ROUTERS ---
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(records.router, prefix="/api/records", tags=["Medical Records"])
app.include_router(abha.router, prefix="/api/abha", tags=["ABHA Integration"])

# 👇 REGISTER THE TRANSFER ROUTER (Crucial!)
app.include_router(transfer.router, prefix="/api/transfer", tags=["QKD Transfer"]) # 👈 NEW

@app.get("/")
def read_root():
    return {"status": "Backend is running", "module": "Hospital-System"}