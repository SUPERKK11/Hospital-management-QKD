from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, records  # <-- IMPT: Import your routes

app = FastAPI()

# --- CORS SETUP (Allows React to talk to Python) ---
origins = [
    "http://localhost:5173",  # React Frontend
    "http://127.0.0.1:5173",  # Alternative React URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    # Allow these specific origins
    allow_credentials=True,
    allow_methods=["*"],      # Allow all methods (GET, POST, PUT, DELETE)
    allow_headers=["*"],      # Allow all headers
)
# ---------------------------------------------------

# --- CONNECT ROUTERS (Restore your Logic) ---
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(records.router, prefix="/api/records", tags=["Medical Records"])

@app.get("/")
def read_root():
    return {"status": "Backend is running", "module": "Hospital-System"}