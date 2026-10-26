import enum
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class JobStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"  # Awaiting Coordinator/TPO review
    PUBLISHED = "PUBLISHED"                # Live for students
    CLOSED = "CLOSED"                      # Deadline passed or drive concluded
    REJECTED = "REJECTED"                  # Rejected by Coordinator


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Recruiter/Coordinator who created it
    
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String)
    job_type = Column(String)  # e.g., Full-Time, Internship, 6M+PPO
    ctc_lpa = Column(Float, nullable=True)       # Package in LPA
    stipend_monthly = Column(Float, nullable=True)  # For internships
    
    # Eligibility Criteria (5-Rule Engine)
    eligibility_cgpa = Column(Float, default=0.0)
    eligible_departments = Column(JSON, default=list)  # e.g., ["CSE", "IT", "ECE"]
    max_backlogs = Column(Integer, default=0)           # Customizable by recruiter
    target_batch_year = Column(Integer, nullable=True)  # e.g., 2026
    
    # Drive scheduling
    drive_date = Column(DateTime(timezone=True), nullable=True)
    deadline = Column(DateTime(timezone=True))
    
    # Approval Pipeline (Spec §2 — Job Lifecycle State Machine)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING_APPROVAL, nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(String, nullable=True)
    
    # Legacy compat — computed from status
    is_approved = Column(Boolean, default=False)  # Kept for backward compat
    is_active = Column(Boolean, default=True)     # Kept for backward compat
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    company = relationship("Company", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    rounds = relationship("JobRound", back_populates="job", cascade="all, delete-orphan", order_by="JobRound.round_number")
