from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from ..database import Base

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    roll_number = Column(String, unique=True, index=True, nullable=True)
    department = Column(String, index=True, nullable=True)
    graduation_year = Column(Integer, index=True, nullable=True)
    cgpa = Column(Float, nullable=True)
    active_backlogs = Column(Integer, default=0)
    
    # AI & Resume Features
    resume_url = Column(String, nullable=True)
    resume_parsed_data = Column(JSON, nullable=True) # Extracted skills, experience, projects
    
    # Relationship to User
    user = relationship("User", backref="student_profile")
