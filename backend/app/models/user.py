import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from ..database import Base

class RoleEnum(str, enum.Enum):
    STUDENT = "STUDENT"
    RECRUITER = "RECRUITER"
    DEPT_COORDINATOR = "DEPT_COORDINATOR"
    TPO_ADMIN = "TPO_ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for Google SSO users (students, coordinators)
    full_name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.STUDENT, nullable=False)
    
    # Department binding (required for DEPT_COORDINATOR, populated for STUDENT from CSV)
    department = Column(String, index=True, nullable=True)
    
    # Account governance
    is_active = Column(Boolean, default=True, nullable=False)
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
