from fastapi import APIRouter, HTTPException, Depends
from app.db.mongodb import get_database
from app.models.record import RecordCreate, RecordResponse
from app.api.auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/create", response_model=RecordResponse)
async def create_record(record: RecordCreate, current_user: dict = Depends(get_current_user)):
    # 1. Security Check: Only Doctors can create records
    if current_user["user_type"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create records")
    
    db = await get_database()
    
    # 2. Verify Patient Exists
    patient = await db["users"].find_one({"email": record.patient_email})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 3. Prepare the Record
    record_dict = record.model_dump()
    record_dict["doctor_id"] = current_user["_id"]
    record_dict["doctor_name"] = current_user["full_name"]
    record_dict["patient_id"] = patient["_id"]
    record_dict["created_at"] = datetime.utcnow()
    
    # 4. Save to MongoDB
    new_record = await db["records"].insert_one(record_dict)
    
    # 5. Return the result
    created_record = await db["records"].find_one({"_id": new_record.inserted_id})
    return created_record

@router.get("/my-records", response_model=list[RecordResponse])
async def get_my_records(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    
    # If Patient: Show records linked to their email
    if current_user["user_type"] == "patient":
        records = await db["records"].find({"patient_email": current_user["email"]}).to_list(100)
    
    # If Doctor: Show records they created
    else:
        records = await db["records"].find({"doctor_id": current_user["_id"]}).to_list(100)
        
    return records