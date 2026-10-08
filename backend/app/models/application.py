import enum
from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class AppStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW = "INTERVIEW"
    OFFERED = "OFFERED"
    REJECTED = "REJECTED"

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"))
    
    status = Column(Enum(AppStatus), default=AppStatus.APPLIED)
    
    # AI Feature
    ai_match_score = Column(Float, nullable=True)
    ai_analysis = Column(JSON, nullable=True)
    
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("StudentProfile", backref="applications")
    job = relationship("JobPosting", back_populates="applications")
