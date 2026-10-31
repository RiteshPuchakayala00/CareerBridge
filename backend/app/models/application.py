import enum
from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class AppStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    IN_PROGRESS = "IN_PROGRESS"  # Active in rounds
    SHORTLISTED = "SHORTLISTED"  # Legacy compatibility
    INTERVIEW = "INTERVIEW"      # Legacy compatibility
    OFFERED = "OFFERED"
    REJECTED = "REJECTED"

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"))
    
    status = Column(Enum(AppStatus), default=AppStatus.APPLIED)
    
    # Spec §5.B: Round State Tracking
    current_round_id = Column(Integer, ForeignKey("job_rounds.id", ondelete="SET NULL"), nullable=True)
    scheduled_slot = Column(DateTime(timezone=True), nullable=True)
    round_started_at = Column(DateTime(timezone=True), nullable=True)
    rejection_round_number = Column(Integer, nullable=True)
    rejection_reason = Column(String, nullable=True)
    
    # AI Feature
    ai_match_score = Column(Float, nullable=True)
    ai_analysis = Column(JSON, nullable=True)
    
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("StudentProfile", backref="applications")
    job = relationship("JobPosting", back_populates="applications")
    current_round = relationship("JobRound", foreign_keys=[current_round_id], back_populates="applications")

