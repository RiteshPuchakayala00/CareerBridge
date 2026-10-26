import secrets
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from ..database import Base

class RecruiterInvitation(Base):
    """Invite-based onboarding for recruiters per spec section 4.B.
    Stores activation tokens and tracks invitation state."""
    __tablename__ = "recruiter_invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    company_name = Column(String, nullable=False)
    
    # Cryptographically secure, time-limited activation token
    token = Column(String, unique=True, index=True, nullable=False, default=lambda: secrets.token_urlsafe(48))
    
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
