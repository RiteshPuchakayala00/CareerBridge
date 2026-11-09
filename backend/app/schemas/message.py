"""
Pydantic Schemas for Messaging, Doubt Desk & Drive FAQs
Spec Reference: docs/messaging_and_inquiry_system_spec.md §4 & §5
"""
from pydantic import BaseModel, field_serializer
from typing import Optional, List
from datetime import datetime
from ..models.message import ThreadType, ThreadStatus


class ChatMessageCreate(BaseModel):
    content: str
    attachment_url: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: int
    thread_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    content: str
    attachment_url: Optional[str] = None
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer('created_at', when_used='always')
    def serialize_created_at(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()


class ThreadCreateRequest(BaseModel):
    job_id: Optional[int] = None
    thread_type: ThreadType = ThreadType.STUDENT_COORDINATOR
    coordinator_id: Optional[int] = None
    recruiter_id: Optional[int] = None
    student_id: Optional[int] = None
    subject: str
    initial_message: Optional[str] = None
    attachment_url: Optional[str] = None


class ThreadStatusUpdate(BaseModel):
    status: ThreadStatus


class PinFaqRequest(BaseModel):
    faq_question: Optional[str] = None
    faq_answer: Optional[str] = None


class MessageThreadSummary(BaseModel):
    id: int
    job_id: Optional[int] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    thread_type: ThreadType
    subject: str
    status: ThreadStatus
    
    # Student metadata for Coordinator Doubt Desk Context
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    student_dept: Optional[str] = None
    student_cgpa: Optional[float] = None
    student_backlogs: Optional[int] = None
    
    # Coordinator & Recruiter participants
    coordinator_id: Optional[int] = None
    coordinator_name: Optional[str] = None
    recruiter_id: Optional[int] = None
    recruiter_name: Optional[str] = None
    
    # Pinned FAQ flag
    is_pinned_faq: bool = False
    faq_question: Optional[str] = None
    faq_answer: Optional[str] = None
    
    unread_count: int = 0
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer('last_message_at', 'created_at', 'updated_at', when_used='always')
    def serialize_summary_datetimes(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()


class MessageThreadDetail(MessageThreadSummary):
    messages: List[ChatMessageResponse] = []


class DriveFaqItem(BaseModel):
    id: int
    thread_id: int
    job_id: Optional[int] = None
    question: str
    answer: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer('created_at', when_used='always')
    def serialize_faq_created_at(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()
