# backend/app/api/transfer.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

# Import our Tools
from app.db.mongodb import get_database
from app.api.auth import get_current_user
from app.utils.quantum import simulate_qkd_exchange
from app.utils.encryption import encrypt_data, decrypt_data
from app.models.record import AuditLog  # <--- NEW IMPORT

router = APIRouter()

# Input model
class TransferRequest(BaseModel):
    record_id: str
    target_hospital_name: str

@router.post("/execute")
async def execute_transfer(req: TransferRequest, current_user: dict = Depends(get_current_user)):
    """
    Simulates a QKD-secured transfer.
    1. Decrypts original data.
    2. Encrypts with new QKD Key.
    3. Sends to Target Hospital's Inbox.
    4. Creates a Government Audit Log.
    """
    db = await get_database()
    
    # --- 1. FETCH THE RECORD (Hospital A's Storage) ---
    try:
        record = await db["records"].find_one({"_id": ObjectId(req.record_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid Record ID format")
        
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # --- 2. DECRYPT THE DATA (Unlock from Storage) ---
    storage_key = record.get("quantum_key")
    
    try:
        if storage_key:
            plain_diagnosis = decrypt_data(record["diagnosis"], storage_key)
            plain_prescription = decrypt_data(record["prescription"], storage_key)
        else:
            plain_diagnosis = record["diagnosis"]
            plain_prescription = record["prescription"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to decrypt source record: {str(e)}")

    # --- 3. PERFORM QKD HANDSHAKE (Generate Transmission Key) ---
    qkd_session = simulate_qkd_exchange()
    transmission_key = qkd_session["final_key"]

    # --- 4. ENCRYPT FOR TRANSMISSION (Lock for Travel) ---
    secure_diagnosis = encrypt_data(plain_diagnosis, transmission_key)
    secure_prescription = encrypt_data(plain_prescription, transmission_key)

    # --- 5. GENERATE THE PACKET (The Digital Envelope) ---
    transfer_packet = {
        "status": "success",
        "sender": current_user.get("hospital", "Unknown"), # Use real sender
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
    # Clean the name: "City General Hospital" -> "inbox_city_general_hospital"
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
    
    # Save to the specific collection for that hospital
    await db[target_collection_name].insert_one(target_record)

    # --- 7. CREATE GOVERNMENT AUDIT LOG (The "Receipt") ---
    # This is what the Government sees. NO medical data.
    new_audit_log = AuditLog(
        sender_hospital=current_user.get("hospital", "Unknown"),
        sender_doctor=current_user.get("username", "Unknown"),
        receiver_hospital=req.target_hospital_name,
        record_id=req.record_id,
        qkd_key_id=f"KEY-{transmission_key[:8]}", # Fake Key ID for display
        status="SECURE (QKD Verified)"
    )
    
    # Convert Pydantic model to dict and save
    await db["audit_logs"].insert_one(new_audit_log.dict(by_alias=True))

    return transfer_packet


# ======================================================
# NEW ENDPOINT: GOVERNMENT AUDIT VIEW
# ======================================================
@router.get("/audit-logs")
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    """
    Secured Endpoint: Only for 'government' role.
    Returns the list of all secure transfers.
    """
    # 1. Check Security Clearance
    if current_user.get("role") != "government":
        raise HTTPException(status_code=403, detail="Access Denied: Government Clearance Required")

    db = await get_database()
    
    # 2. Fetch Logs (Newest First)
    cursor = db["audit_logs"].find().sort("timestamp", -1)
    logs = await cursor.to_list(length=50)
    
    # 3. Clean IDs for JSON response
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        
    return logs


# ======================================================
# EXISTING ENDPOINT: HOSPITAL INBOX
# ======================================================
@router.get("/inbox/{hospital_name}")
async def view_hospital_inbox(hospital_name: str):
    """
    Reads the encrypted messages from a specific hospital's inbox.
    """
    db = await get_database()
    
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