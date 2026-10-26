"""
Pydantic Schemas for Notifications & Targeted Broadcasts
Spec Reference: docs/notification_and_broadcast_spec.md §5 & §6
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.notification import NotificationCategory, BroadcastPriority


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    category: NotificationCategory
    action_url: Optional[str] = None
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse] = []
    unread_count: int = 0


class BroadcastCreateRequest(BaseModel):
    title: str
    message: str
    priority: BroadcastPriority = BroadcastPriority.NORMAL
    target_batch_year: Optional[int] = None
    target_departments: Optional[List[str]] = None
    target_placement_status: str = "ALL"  # ALL, UNPLACED_ONLY, PLACED_ONLY
    target_job_id: Optional[int] = None
    expires_at: Optional[datetime] = None


class BroadcastResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    sender_role: str
    title: str
    message: str
    priority: BroadcastPriority
    target_batch_year: Optional[int] = None
    target_departments: Optional[List[str]] = None
    target_placement_status: str
    target_job_id: Optional[int] = None
    target_job_title: Optional[str] = None
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
