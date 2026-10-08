from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String)
    job_type = Column(String) # e.g., Internship, Full-Time
    ctc_lpa = Column(Float, nullable=True)
    
    # Eligibility Criteria
    eligibility_cgpa = Column(Float, default=0.0)
    eligible_departments = Column(JSON) # e.g., ["CSE", "ECE"]
    
    is_active = Column(Boolean, default=True)
    deadline = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    company = relationship("Company", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete")
