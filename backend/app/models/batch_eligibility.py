from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base

class BatchEligibility(Base):
    """Controls which graduation_year batches are allowed to log in.
    TPO_ADMIN toggles these via the dashboard to gate access per the spec.
    Supports granular drive-type control: full-time vs internship independently."""
    __tablename__ = "batch_eligibility"

    id = Column(Integer, primary_key=True, index=True)
    graduation_year = Column(Integer, unique=True, index=True, nullable=False)
    label = Column(String, nullable=True)            # e.g., "4th Year (Batch 2022-2026)"
    is_active = Column(Boolean, default=False, nullable=False)       # Master login toggle
    allow_internships = Column(Boolean, default=False, nullable=False)  # Allow internship drives
    allow_full_time = Column(Boolean, default=True, nullable=False)     # Allow full-time drives
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), default=func.now())

    @property
    def is_login_allowed(self) -> bool:
        return self.is_active

    @is_login_allowed.setter
    def is_login_allowed(self, val: bool):
        self.is_active = val
