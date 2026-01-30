from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime
from bson import ObjectId

# Tool to convert ObjectId -> String
PyObjectId = Annotated[str, BeforeValidator(str)]

class RecordBase(BaseModel):
    patient_email: str
    diagnosis: str
    prescription: str
    notes: Optional[str] = None

class RecordCreate(RecordBase):
    pass

class RecordResponse(RecordBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    doctor_name: str
    created_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )