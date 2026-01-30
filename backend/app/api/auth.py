from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import timedelta

# Import your local tools
from app.db.mongodb import get_database
from app.models.user import PatientCreate, DoctorCreate, UserResponse
from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    SECRET_KEY, 
    ALGORITHM
)

# 1. Setup the Router and Security Scheme
router = APIRouter()
# This tells Swagger where to send the username/password to get a token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# --- REGISTRATION ---
@router.post("/register/patient", response_model=UserResponse)
async def register_patient(patient: PatientCreate):
    db = await get_database()

    # Check if email already exists
    if await db["users"].find_one({"email": patient.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash the password
    hashed_password = get_password_hash(patient.password)

    # Save to MongoDB
    user_dict = patient.model_dump()
    user_dict["password"] = hashed_password
    
    new_user = await db["users"].insert_one(user_dict)

    # Return the created user
    created_user = await db["users"].find_one({"_id": new_user.inserted_id})
    return created_user

@router.post("/register/doctor", response_model=UserResponse)
async def register_doctor(doctor: DoctorCreate):
    db = await get_database()

    # 1. Check if email already exists
    if await db["users"].find_one({"email": doctor.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash the password
    hashed_password = get_password_hash(doctor.password)

    # 3. Save to MongoDB
    user_dict = doctor.model_dump()
    user_dict["password"] = hashed_password
    
    new_user = await db["users"].insert_one(user_dict)

    # 4. Return the created user
    created_user = await db["users"].find_one({"_id": new_user.inserted_id})
    return created_user


# --- LOGIN ---
@router.post("/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db = await get_database()
    
    # OAuth2 form uses 'username', but we treat it as email
    user = await db["users"].find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate Token
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# --- SECURITY CHECK (The "Bouncer") ---
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = await get_database()
    user = await db["users"].find_one({"email": email})

    if user is None:
        raise credentials_exception

    return user

# --- PROTECTED ROUTE (VIP Room) ---
@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user