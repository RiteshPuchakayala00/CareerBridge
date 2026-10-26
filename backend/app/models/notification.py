"""
Notification & Broadcast Models — CareerBridge In-App Notification Hub
Spec Reference: docs/notification_and_broadcast_spec.md §5
- Individual User Notifications (Bell Hub)
- Manual Targeted Broadcasts & Urgent Flash Banners
"""
import enum
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class NotificationCategory(str, enum.Enum):
    JOB_ALERT = "JOB_ALERT"
    SHORTLIST = "SHORTLIST"
    INTERVIEW_REMINDER = "INTERVIEW_REMINDER"
    INQUIRY_REPLY = "INQUIRY_REPLY"
    OFFER = "OFFER"
    BROADCAST = "BROADCAST"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    category = Column(Enum(NotificationCategory), default=NotificationCategory.BROADCAST, nullable=False)
    
    action_url = Column(String, nullable=True)  # e.g., "/student" or "/coordinator"
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="notifications")


class BroadcastPriority(str, enum.Enum):
    NORMAL = "NORMAL"
    URGENT = "URGENT"  # Renders as Flash Banner (Spec §4.B)


class BroadcastAnnouncement(Base):
    __tablename__ = "broadcast_announcements"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # TPO or Coordinator
    
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(Enum(BroadcastPriority), default=BroadcastPriority.NORMAL, nullable=False)
    
    # Targeting Filters (Spec §4.A)
    target_batch_year = Column(Integer, nullable=True)       # e.g., 2026
    target_departments = Column(JSON, nullable=True)         # e.g., ["CSE", "ECE"]
    target_placement_status = Column(String, default="ALL")  # ALL / UNPLACED_ONLY / PLACED_ONLY
    target_job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="SET NULL"), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    job = relationship("JobPosting", foreign_keys=[target_job_id])
