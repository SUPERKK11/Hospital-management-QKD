from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

# ✅ Import your DB connection
# (Adjust this import based on where your 'db' object is defined in app/db/mongodb.py)
from app.db.mongodb import db 

router = APIRouter()

# --- Response Schema (What the frontend receives) ---
class DoctorResponse(BaseModel):
    id: str
    name: str
    spec: str = "General"
    hospital: str
    status: str = "Available" # Defaulting to Available for now

@router.get("/", response_model=List[DoctorResponse])
async def get_doctors_by_hospital(hospital: str = Query(..., description="Hospital Name")):
    """
    Fetch all users with role 'doctor' belonging to a specific hospital.
    """
    print(f"🔍 Searching for doctors in: {hospital}") # Debug log

    # 1. Query MongoDB 'users' collection
    # We filter by role="doctor" AND the hospital name
    doctors_cursor = db.users.find(
        {"role": "doctor", "hospital": hospital},
        {"_id": 0, "full_name": 1, "email": 1, "specialization": 1, "hospital": 1}
    )
    
    doctors_list = await doctors_cursor.to_list(length=100)

    # 2. Format data for the Frontend
    formatted_doctors = []
    for doc in doctors_list:
        formatted_doctors.append(DoctorResponse(
            id=doc.get("email"), # Using email as unique ID for frontend key
            name=doc.get("full_name", "Unknown Doctor"),
            spec=doc.get("specialization", "General Doctor"),
            hospital=doc.get("hospital"),
            status="Available" # You can add a status field to your DB later
        ))

    return formatted_doctors