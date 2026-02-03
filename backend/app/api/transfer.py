from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from bson import ObjectId
from datetime import datetime
import logging
import hashlib

# Database & Auth
from app.db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.auth import get_current_user
from app.utils.encryption import encrypt_data, decrypt_data # Ensure this is imported
from app.utils.quantum import simulate_qkd_exchange # Ensure this is imported

router = APIRouter()
logger = logging.getLogger(__name__)

# Input Model for Batch Transfer
class BatchTransferRequest(BaseModel):
    record_ids: List[str]
    target_hospital_name: str

# --- 1. EXECUTE BATCH (SENDER) ---
@router.post("/execute-batch")
async def execute_batch_transfer(
    req: BatchTransferRequest, 
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    summary = { "success": [], "skipped": [], "failed": [] }
    safe_target_name = req.target_hospital_name.lower().strip().replace(" ", "_")
    target_collection_name = f"inbox_{safe_target_name}"

    for rid in req.record_ids:
        try:
            if not ObjectId.is_valid(rid):
                summary["failed"].append({"id": rid, "reason": "Invalid ID"})
                continue

            record = await db["records"].find_one({"_id": ObjectId(rid)})
            if not record:
                summary["failed"].append({"id": rid, "reason": "Not Found"})
                continue

            # Decrypt source data to re-encrypt for target
            storage_key = record.get("quantum_key")
            plain_diagnosis = record["diagnosis"] # Default fallback
            if storage_key:
                try:
                    plain_diagnosis = decrypt_data(record["diagnosis"], storage_key)
                except:
                    pass # Keep as is if decryption fails

            # Generate Signature
            raw_data_string = f"{record.get('patient_id')}-{plain_diagnosis}"
            data_signature = hashlib.sha256(raw_data_string.encode()).hexdigest()

            # Check Duplicates in Target Inbox
            existing = await db[target_collection_name].find_one({
                "original_record_id": rid, "data_signature": data_signature
            })
            if existing:
                summary["skipped"].append(rid)
                continue 

            # QKD Simulation
            qkd_session = simulate_qkd_exchange()
            transmission_key = qkd_session["final_key"]
            secure_diagnosis = encrypt_data(plain_diagnosis, transmission_key)

            # Create Packet
            transfer_packet = {
                "original_record_id": rid,
                "received_from": current_user.get("hospital", "Unknown"),
                "sender_hospital": current_user.get("hospital", "Unknown"), # Explicit sender field
                "target_hospital": req.target_hospital_name, 
                "patient_id": record.get("patient_id"),
                "patient_email": record.get("patient_email"), # Pass identity info
                "patient_abha": record.get("patient_abha"),   # Pass identity info
                "encrypted_diagnosis": secure_diagnosis,
                "prescription": record.get("prescription"),   # Pass prescription
                "decryption_key": transmission_key,
                "data_signature": data_signature,
                "received_at": datetime.now(),
                "status": "LOCKED"
            }
            await db[target_collection_name].insert_one(transfer_packet)

            # Audit Log
            await db["audit_logs"].insert_one({
                "sender_hospital": current_user.get("hospital", "Unknown"),
                "receiver_hospital": req.target_hospital_name,
                "record_id": rid,
                "status": "SECURE TRANSFER",
                "timestamp": datetime.now()
            })
            summary["success"].append(rid)

        except Exception as e:
            summary["failed"].append({"id": rid, "reason": str(e)})

    return summary

# --- 2. GET INBOX (VIEWER) ---
@router.get("/my-inbox")
async def get_my_hospital_inbox(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    my_hospital = current_user.get("hospital")
    if not my_hospital: return []

    safe_name = my_hospital.lower().strip().replace(" ", "_")
    collection_name = f"inbox_{safe_name}"

    inbox_records = await db[collection_name].find().sort("received_at", -1).limit(50).to_list(50)

    formatted_records = []
    for rec in inbox_records:
        rec["id"] = str(rec["_id"])
        del rec["_id"]
        rec["sender"] = rec.get("received_from", "Unknown")
        rec["diagnosis"] = "🔒 Encrypted Content" 
        rec["prescription"] = str(rec.get("encrypted_diagnosis", ""))[:40] + "..."
        formatted_records.append(rec)

    return formatted_records

# --- 3. ACCEPT TRANSFER (THE FIX) ---
class AcceptRequest(BaseModel):
    inbox_id: str

@router.post("/accept")
async def accept_transfer(req: AcceptRequest, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    
    # Identify the Inbox
    hospital = current_user.get("hospital")
    safe_name = hospital.lower().strip().replace(" ", "_")
    inbox_collection = f"inbox_{safe_name}"

    if not ObjectId.is_valid(req.inbox_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    record_in_inbox = await db[inbox_collection].find_one({"_id": ObjectId(req.inbox_id)})
    
    if not record_in_inbox:
        raise HTTPException(status_code=404, detail="Record not found in Inbox")

    # Decrypt the data using the transmission key (Simulating 'Unlocking')
    try:
        key = record_in_inbox.get("decryption_key")
        encrypted_text = record_in_inbox.get("encrypted_diagnosis")
        decrypted_diagnosis = decrypt_data(encrypted_text, key)
    except:
        decrypted_diagnosis = "Decryption Error - Manual Review Needed"

    # Create NEW record in the main 'records' collection
    # ⚠️ CRITICAL: We assign YOU (current_user) as the new doctor so it shows in your dashboard
    new_record = {
        "doctor_id": str(current_user["_id"]),  
        "doctor_name": current_user["full_name"],
        "hospital": current_user["hospital"],
        
        # Copied Data
        "patient_email": record_in_inbox.get("patient_email"),
        "patient_abha": record_in_inbox.get("patient_abha"),
        "patient_id": record_in_inbox.get("patient_id"),
        "diagnosis": decrypted_diagnosis,     
        "prescription": record_in_inbox.get("prescription"), 
        
        "created_at": datetime.now(),
        "transferred_from": record_in_inbox.get("sender_hospital"),
        "is_transferred": True
    }

    await db["records"].insert_one(new_record)

    # Remove from Inbox (Cleanup)
    await db[inbox_collection].delete_one({"_id": ObjectId(req.inbox_id)})

    return {"status": "success", "message": "Patient accepted into your database"}