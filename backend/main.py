from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, records, abha 

# 👇 IMPORT DB CONNECTION FUNCTIONS
# (We try to import standard names; if your names are different, we'll see an error)
try:
    from app.db.mongodb import connect_to_mongo, close_mongo_connection
except ImportError:
    # Fallback if names are different - we will catch this in logs
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