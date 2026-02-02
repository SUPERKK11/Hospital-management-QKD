from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection

# --- Import Routers ---
from app.api.auth import router as auth_router
from app.api.records import router as records_router 
from app.api.transfer import router as transfer_router 
# If you have an AI file (e.g., ai.py), import it here. If not, comment the next line out.
# from app.api.ai import router as ai_router 

# --- Lifespan: Handles startup and shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to DB
    await connect_to_mongo()
    print("✅ Database Connected")
    yield
    # Shutdown: Close DB
    await close_mongo_connection()
    print("❌ Database Disconnected")

# --- Initialize App ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register Routers ---
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(records_router, prefix="/api/records", tags=["Medical Records"])
app.include_router(transfer_router, prefix="/api/transfer", tags=["QKD Transfer"])

# If you have AI logic ready:
# app.include_router(ai_router, prefix="/api", tags=["AI"]) 

# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {"status": "System Online", "database": settings.DB_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)