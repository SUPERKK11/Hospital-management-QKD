from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
import logging
import hashlib  # 👈 Added for Data Fingerprinting

# Database & Auth
from app.db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.auth import get_current_user

# Encryption & QKD Tools
from app.utils.quantum import simulate_qkd_exchange
from app.utils.encryption import encrypt_data, decrypt_data

router = APIRouter()
logger = logging.getLogger(__name__)

# Input Model
class BatchTransferRequest(BaseModel):
    record_ids: List[str]
    target_hospital_name: str

@router.post("/execute-batch")
async def execute_batch_transfer(
    req: BatchTransferRequest, 
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Transfers records ONLY if the data content is new.
    Allows re-transferring the same patient if their diagnosis has changed.
    """
    summary = {
        "success": [],
        "skipped": [],
        "failed": []
    }

    safe_target_name = req.target_hospital_name.lower().strip().replace(" ", "_")
    target_collection_name = f"inbox_{safe_target_name}"

    for rid in req.record_ids:
        try:
            # --- 1. FETCH SOURCE FIRST (To check content) ---
            if not ObjectId.is_valid(rid):
                summary["failed"].append({"id": rid, "reason": "Invalid ID"})
                continue

            record = await db["records"].find_one({"_id": ObjectId(rid)})
            if not record:
                summary["failed"].append({"id": rid, "reason": "Not Found"})
                continue

            # --- 2. DECRYPT SOURCE DATA ---
            storage_key = record.get("quantum_key")
            # We need the plain text to generate the signature
            try:
                if storage_key:
                    plain_diagnosis = decrypt_data(record["diagnosis"], storage_key)
                else:
                    plain_diagnosis = record["diagnosis"]
            except:
                summary["failed"].append({"id": rid, "reason": "Decryption Error"})
                continue

            # --- 3. GENERATE DATA FINGERPRINT (HASH) ---
            # We create a unique signature based on the Patient ID + Current Diagnosis.
            # If the diagnosis changes, this signature changes.
            raw_data_string = f"{record.get('patient_id')}-{plain_diagnosis}"
            data_signature = hashlib.sha256(raw_data_string.encode()).hexdigest()

            # --- 4. SMART DUPLICATE CHECK ---
            # We check if this specific VERSION of the data exists in the inbox.
            existing_transfer = await db[target_collection_name].find_one({
                "original_record_id": rid,
                "data_signature": data_signature  # 👈 Check against the signature
            })

            if existing_transfer:
                summary["skipped"].append(rid) # Skip ONLY if exact data match
                continue 

            # --- 5. QKD & ENCRYPT ---
            # If we get here, the data is new (or updated)
            qkd_session = simulate_qkd_exchange()
            transmission_key = qkd_session["final_key"]
            secure_diagnosis = encrypt_data(plain_diagnosis, transmission_key)

            # --- 6. SAVE TO TARGET INBOX ---
            transfer_packet = {
                "original_record_id": rid,
                "received_from": current_user.get("hospital", "Unknown"),
                "target_hospital": req.target_hospital_name, 
                "patient_id": record.get("patient_id"),
                "encrypted_diagnosis": secure_diagnosis,
                "decryption_key": transmission_key,
                "data_signature": data_signature, # 👈 Store signature for future checks
                "received_at": datetime.now(),
                "status": "LOCKED"
            }
            await db[target_collection_name].insert_one(transfer_packet)

            # --- 7. AUDIT LOG ---
            audit_log = {
                "sender_hospital": current_user.get("hospital", "Unknown"),
                "receiver_hospital": req.target_hospital_name,
                "record_id": rid,
                "status": "SECURE TRANSFER",
                "timestamp": datetime.now()
            }
            await db["audit_logs"].insert_one(audit_log)

            summary["success"].append(rid)

        except Exception as e:
            logger.error(f"Error processing {rid}: {e}")
            summary["failed"].append({"id": rid, "reason": str(e)})

    return summary

# ==========================================
# 🆕 MY INBOX ENDPOINT (FIXES DASHBOARD)
# ==========================================
@router.get("/my-inbox")
async def get_my_hospital_inbox(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Fetches records sitting in the logged-in doctor's hospital inbox.
    """
    # 1. Identify the Hospital from the User Token
    my_hospital = current_user.get("hospital")
    if not my_hospital:
        # If user has no hospital (e.g. government/patient), return empty
        return []

    # 2. Determine Collection Name (e.g., "inbox_hospital_b")
    safe_name = my_hospital.lower().strip().replace(" ", "_")
    collection_name = f"inbox_{safe_name}"

    # 3. Fetch Records (Sort by newest first)
    inbox_records = await db[collection_name].find().sort("received_at", -1).limit(50).to_list(50)

    # 4. Format for Frontend
    formatted_records = []
    for rec in inbox_records:
        rec["id"] = str(rec["_id"])
        del rec["_id"]
        
        # UI Helpers: Ensure we have a displayable sender name
        rec["sender"] = rec.get("received_from", "Unknown")
        # Provide a snippet for preview
        rec["diagnosis"] = "🔒 Encrypted Content" 
        rec["prescription"] = str(rec.get("encrypted_diagnosis", ""))[:40] + "..."
            
        formatted_records.append(rec)

    return formatted_records

# ==========================================
# PUBLIC INBOX ENDPOINT (For Debug/Admin)
# ==========================================
@router.get("/inbox/{hospital_name}")
async def view_hospital_inbox(
    hospital_name: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    safe_name = hospital_name.lower().strip().replace(" ", "_")
    # Sort by time so newest updates appear at the top
    cursor = db[f"inbox_{safe_name}"].find().sort("received_at", -1)
    messages = await cursor.to_list(length=50)
    
    for msg in messages:
        msg["id"] = str(msg["_id"])
        del msg["_id"]
        msg["encrypted_preview"] = str(msg.get("encrypted_diagnosis", ""))[:40] + "..."
        
    return messages

# ==========================================
# DECRYPT ENDPOINT
# ==========================================
class DecryptRequest(BaseModel):
    inbox_id: str

@router.post("/decrypt-record")
async def decrypt_inbox_record(
    req: DecryptRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    my_hospital = current_user.get("hospital")
    safe_name = my_hospital.lower().strip().replace(" ", "_")
    collection_name = f"inbox_{safe_name}"

    if not ObjectId.is_valid(req.inbox_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    record = await db[collection_name].find_one({"_id": ObjectId(req.inbox_id)})
    if not record:
        raise HTTPException(status_code=404, detail="Message not found")

    try:
        key = record.get("decryption_key")
        encrypted_text = record.get("encrypted_diagnosis")
        plaintext = decrypt_data(encrypted_text, key)
        
        await db[collection_name].update_one(
            {"_id": ObjectId(req.inbox_id)},
            {"$set": {"status": "UNLOCKED"}}
        )
        return {"status": "success", "decrypted_diagnosis": plaintext}
    except Exception:
        raise HTTPException(status_code=500, detail="Decryption failed")