from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.api.auth import router as auth_router
from app.api.records import router as records_router 

# --- Lifespan: Handles startup and shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to DB
    await connect_to_mongo()
    yield
    # Shutdown: Close DB
    await close_mongo_connection()

# --- Initialize App ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# --- CORS Middleware (Allows Frontend to talk to Backend) ---
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

# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {"status": "System Online", "database": settings.DB_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)