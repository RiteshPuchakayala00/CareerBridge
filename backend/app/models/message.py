"""
Messaging and Inquiry Models — CareerBridge Doubt Desk & Drive Logistics
Spec Reference: docs/messaging_and_inquiry_system_spec.md §4
- Lane 1: Student <-> Coordinator (Doubt Desk)
- Lane 2: Coordinator / TPO <-> Recruiter (Drive Logistics)
- The Shield Principle: Direct student-to-recruiter messaging is prohibited.
"""
import enum
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ThreadType(str, enum.Enum):
    STUDENT_COORDINATOR = "STUDENT_COORDINATOR"      # Doubt desk (Lane 1)
    COORDINATOR_RECRUITER = "COORDINATOR_RECRUITER"  # Drive operations (Lane 2)


class ThreadStatus(str, enum.Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"


class MessageThread(Base):
    __tablename__ = "message_threads"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=True)
    thread_type = Column(Enum(ThreadType), nullable=False)
    
    # Participants
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)        # Lane 1
    coordinator_id = Column(Integer, ForeignKey("users.id"), nullable=True)    # Lane 1 & 2
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=True)      # Lane 2
    
    subject = Column(String, nullable=False)  # e.g. "Doubt regarding test format"
    status = Column(Enum(ThreadStatus), default=ThreadStatus.OPEN, nullable=False)
    
    # FAQ Promotion Feature (§2.C)
    is_pinned_faq = Column(Boolean, default=False, nullable=False)
    faq_question = Column(String, nullable=True)
    faq_answer = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    job = relationship("JobPosting", backref="message_threads")
    student = relationship("User", foreign_keys=[student_id])
    coordinator = relationship("User", foreign_keys=[coordinator_id])
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    messages = relationship(
        "ChatMessage", 
        back_populates="thread", 
        cascade="all, delete-orphan", 
        order_by="ChatMessage.created_at"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    content = Column(Text, nullable=False)
    attachment_url = Column(String, nullable=True)  # Optional screenshot/document
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
