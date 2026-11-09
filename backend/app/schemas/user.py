from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from ..models.user import RoleEnum

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: RoleEnum = RoleEnum.STUDENT

class UserCreate(UserBase):
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: RoleEnum
    department: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    needs_password_setup: bool = False

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
