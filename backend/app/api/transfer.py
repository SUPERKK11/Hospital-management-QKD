from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
import logging

# ✅ Import Database Dependency
from app.db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import Tools
from app.api.auth import get_current_user
from app.utils.quantum import simulate_qkd_exchange
from app.utils.encryption import encrypt_data, decrypt_data
from app.models.record import AuditLog

router = APIRouter()

# Setup Logger
logger = logging.getLogger(__name__)

# Input model
class TransferRequest(BaseModel):
    record_id: str
    target_hospital_name: str

@router.post("/execute")
async def execute_transfer(
    req: TransferRequest, 
    current_user: dict = Depends(get_current_user),
    # 👇 FIX: Inject Database Connection Safely
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Simulates a QKD-secured transfer.
    """
    try:
        # --- 1. FETCH THE RECORD (Hospital A's Storage) ---
        if not ObjectId.is_valid(req.record_id):
            raise HTTPException(status_code=400, detail="Invalid Record ID format")

        record = await db["records"].find_one({"_id": ObjectId(req.record_id)})
        
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")

        # --- 2. DECRYPT THE DATA (Unlock from Storage) ---
        storage_key = record.get("quantum_key")
        
        # Handle cases where data might not be encrypted yet
        try:
            if storage_key:
                plain_diagnosis = decrypt_data(record["diagnosis"], storage_key)
                plain_prescription = decrypt_data(record["prescription"], storage_key)
            else:
                plain_diagnosis = record["diagnosis"]
                plain_prescription = record["prescription"]
        except Exception as e:
            logger.error(f"Decryption Error: {e}")
            raise HTTPException(status_code=500, detail="Failed to decrypt source record. Data may be corrupted.")

        # --- 3. PERFORM QKD HANDSHAKE (Generate Transmission Key) ---
        qkd_session = simulate_qkd_exchange()
        transmission_key = qkd_session["final_key"]

        # --- 4. ENCRYPT FOR TRANSMISSION (Lock for Travel) ---
        secure_diagnosis = encrypt_data(plain_diagnosis, transmission_key)
        secure_prescription = encrypt_data(plain_prescription, transmission_key)

        # --- 5. GENERATE THE PACKET (The Digital Envelope) ---
        transfer_packet = {
            "status": "success",
            "sender": current_user.get("hospital", "Unknown"), 
            "receiver": req.target_hospital_name,
            "timestamp": datetime.now(),
            "qkd_stats": {
                "protocol": "BB84 Simulation",
                "bits_exchanged": qkd_session.get("raw_bits_length", 256),
                "transmission_key_hash": transmission_key[:10] + "..." 
            },
            "secure_payload": {
                "patient_id": str(record.get("patient_id", "Unknown")),
                "encrypted_diagnosis": secure_diagnosis,
                "encrypted_prescription": secure_prescription,
                "decryption_key_for_receiver": transmission_key 
            }
        }

        # --- 6. DYNAMIC TRANSFER (Save to the Correct Inbox) ---
        safe_target_name = req.target_hospital_name.lower().strip().replace(" ", "_")
        target_collection_name = f"inbox_{safe_target_name}"

        target_record = {
            "original_record_id": req.record_id,
            "received_from": current_user.get("hospital", "Unknown"),
            "target_hospital": req.target_hospital_name, 
            "patient_id": record.get("patient_id"),
            "encrypted_diagnosis": secure_diagnosis,
            "received_at": datetime.now(),
            "status": "LOCKED (Requires QKD Key)"
        }
        
        await db[target_collection_name].insert_one(target_record)

        # --- 7. CREATE GOVERNMENT AUDIT LOG ---
        new_audit_log = AuditLog(
            sender_hospital=current_user.get("hospital", "Unknown"),
            sender_doctor=current_user.get("username", "Unknown"),
            receiver_hospital=req.target_hospital_name,
            record_id=req.record_id,
            qkd_key_id=f"KEY-{transmission_key[:8]}", 
            status="SECURE (QKD Verified)"
        )
        
        await db["audit_logs"].insert_one(new_audit_log.dict(by_alias=True))

        return transfer_packet

    except HTTPException as he:
        raise he # Re-raise expected HTTP errors
    except Exception as e:
        # 👇 This captures the real 500 error in your terminal
        logger.error(f"❌ TRANSFER FAILED: {str(e)}")
        print(f"❌ CRITICAL TRANSFER ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transfer failed: {str(e)}")


# ======================================================
# AUDIT LOGS ENDPOINT
# ======================================================
@router.get("/audit-logs")
async def get_audit_logs(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database) # 👈 FIXED
):
    """
    Secured Endpoint: Only for 'government' role.
    """
    if current_user.get("role") != "government":
        raise HTTPException(status_code=403, detail="Access Denied: Government Clearance Required")

    cursor = db["audit_logs"].find().sort("timestamp", -1)
    logs = await cursor.to_list(length=50)
    
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        
    return logs


# ======================================================
# HOSPITAL INBOX ENDPOINT
# ======================================================
@router.get("/inbox/{hospital_name}")
async def view_hospital_inbox(
    hospital_name: str,
    db: AsyncIOMotorDatabase = Depends(get_database) # 👈 FIXED
):
    """
    Reads the encrypted messages from a specific hospital's inbox.
    """
    safe_name = hospital_name.lower().strip().replace(" ", "_")
    collection_name = f"inbox_{safe_name}"
    
    cursor = db[collection_name].find().sort("received_at", -1)
    messages = await cursor.to_list(length=20)
    
    results = []
    for msg in messages:
        results.append({
            "id": str(msg["_id"]),
            "from": msg.get("received_from", "Unknown"),
            "time": msg.get("received_at"),
            "status": msg.get("status", "LOCKED"),
            "patient_id": msg.get("patient_id", "Unknown"),
            "encrypted_preview": str(msg.get("encrypted_diagnosis", ""))[:50] + "..."
        })
        
    return results