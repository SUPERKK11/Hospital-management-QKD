from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class RecordCreate(BaseModel):
    # Doctor can find patient by Email OR ABHA (Either/Or Logic)
    patient_email: Optional[EmailStr] = None
    patient_abha: Optional[str] = None
    
    diagnosis: str
    prescription: str

class RecordResponse(BaseModel):
    id: str = Field(alias="_id")
    doctor_name: str
    hospital: Optional[str] = "Unknown"  # <--- New Field for Silo Logic
    
    patient_id: str
    patient_abha: Optional[str] = None   # <--- New Field for Patient View
    
    diagnosis: str
    prescription: str
    created_at: datetime
    
    # We hide the quantum key in the response for security, 
    # but we keep it in the DB.
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}