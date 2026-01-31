from fastapi import APIRouter, HTTPException, Depends
from app.db.mongodb import get_database
from app.models.record import RecordCreate, RecordResponse
from app.api.auth import get_current_user
from datetime import datetime

# ⚛️ IMPORT QUANTUM TOOLS
from app.utils.quantum import simulate_qkd_exchange
from app.utils.encryption import encrypt_data, decrypt_data

router = APIRouter()

@router.post("/create", response_model=RecordResponse)
async def create_record(record: RecordCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create records")
    
    db = await get_database()
    patient = await db["users"].find_one({"email": record.patient_email})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # -------------------------------------------------------
    # ⚛️ QUANTUM ENCRYPTION STEP
    # -------------------------------------------------------
    # 1. Run the BB84 Quantum Simulation to get a unique key
    qkd_result = simulate_qkd_exchange()
    secret_key = qkd_result['final_key']

    # 2. Encrypt the sensitive data (Diagnosis & Prescription)
    # We encrypt it here so the database NEVER sees the real text.
    encrypted_diagnosis = encrypt_data(record.diagnosis, secret_key)
    encrypted_prescription = encrypt_data(record.prescription, secret_key)

    record_dict = record.model_dump()
    
    # 3. Overwrite plain text with Encrypted text
    record_dict["diagnosis"] = encrypted_diagnosis
    record_dict["prescription"] = encrypted_prescription
    
    # 4. Save the Key (In a real system, this goes to a separate Quantum Vault)
    record_dict["quantum_key"] = secret_key
    
    # -------------------------------------------------------

    record_dict["doctor_id"] = current_user["_id"]
    record_dict["doctor_name"] = current_user["full_name"]
    record_dict["patient_id"] = patient["_id"]
    record_dict["created_at"] = datetime.utcnow()
    
    new_record = await db["records"].insert_one(record_dict)
    
    # Return the record (We decrypt it for the Doctor immediately)
    created_record = await db["records"].find_one({"_id": new_record.inserted_id})
    
    # Decrypt for response
    created_record["diagnosis"] = decrypt_data(created_record["diagnosis"], secret_key)
    created_record["prescription"] = decrypt_data(created_record["prescription"], secret_key)
    
    return created_record

@router.get("/my-records", response_model=list[RecordResponse])
async def get_my_records(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    
    # Fetch records based on role
    if current_user["user_type"] == "patient":
        records = await db["records"].find({"patient_email": current_user["email"]}).to_list(100)
    else:
        records = await db["records"].find({"doctor_id": current_user["_id"]}).to_list(100)
    
    # Add this line to spy on the raw database data
    print("\n🕵️ RAW DATABASE DATA (What the Hacker sees):")
    for r in records:
        print(f"   -> Diagnosis: {r.get('diagnosis')} (Key: {r.get('quantum_key', 'None')[:5]}...)")
    print("-" * 30 + "\n")
    
    # -------------------------------------------------------
    # ⚛️ QUANTUM DECRYPTION STEP
    # -------------------------------------------------------
    # The database gives us encrypted gibberish. We must decrypt it
    # before sending it to the Frontend.
    
    decrypted_records = []
    for rec in records:
        try:
            # Check if this record has a quantum key (Old records won't)
            if "quantum_key" in rec:
                key = rec["quantum_key"]
                rec["diagnosis"] = decrypt_data(rec["diagnosis"], key)
                rec["prescription"] = decrypt_data(rec["prescription"], key)
            
            decrypted_records.append(rec)
        except Exception as e:
            print(f"Decryption Error for record {rec['_id']}: {e}")
            # If decryption fails, show the encrypted text so we know something is wrong
            decrypted_records.append(rec)
            
    return decrypted_records