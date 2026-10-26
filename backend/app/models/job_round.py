import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from ..database import Base

class RoundType(str, enum.Enum):
    ONLINE_TEST = "ONLINE_TEST"
    VIRTUAL_INTERVIEW = "VIRTUAL_INTERVIEW"
    OFFLINE_INTERVIEW = "OFFLINE_INTERVIEW"
    GROUP_DISCUSSION = "GROUP_DISCUSSION"

class JobRound(Base):
    __tablename__ = "job_rounds"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    
    round_number = Column(Integer, nullable=False)  # 1, 2, 3...
    name = Column(String, nullable=False)           # e.g., "Online Coding Assessment"
    round_type = Column(Enum(RoundType), nullable=False)
    description = Column(Text, nullable=True)       # Instructions / Syllabus / Required Materials
    
    # Logistics & Links (Spec §3)
    test_url = Column(String, nullable=True)        # For ONLINE_TEST
    meeting_url = Column(String, nullable=True)     # For VIRTUAL_INTERVIEW
    venue = Column(String, nullable=True)           # For OFFLINE_INTERVIEW (Lab/Room)
    access_code = Column(String, nullable=True)     # Test passkey or meeting PIN
    
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    job = relationship("JobPosting", back_populates="rounds")
    applications = relationship("Application", back_populates="current_round", foreign_keys="Application.current_round_id")
