"""
Notification Hub & Targeted Broadcast Routes
Spec Reference: docs/notification_and_broadcast_spec.md
- Bell Center Tray & Notifications
- Targeted TPO & Coordinator Broadcasts
- Urgent Flash Announcement Banners
- Coordinator Boundary Enforcement (§1.3)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from typing import List, Optional

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..models.job import JobPosting
from ..models.application import Application
from ..models.notification import (
    Notification, NotificationCategory,
    BroadcastAnnouncement, BroadcastPriority
)
from ..schemas.notification import (
    NotificationResponse, NotificationListResponse,
    BroadcastCreateRequest, BroadcastResponse
)
from ..services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["Notifications & Broadcasts"])


# ─────────────────────────────────────────────────────────────
# Reusable helper to emit system notifications
# ─────────────────────────────────────────────────────────────
def create_system_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    category: NotificationCategory = NotificationCategory.BROADCAST,
    action_url: Optional[str] = None
) -> Notification:
    """Helper used across CareerBridge modules to trigger event-driven alerts."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        category=category,
        action_url=action_url,
        is_read=False
    )
    db.add(notif)
    return notif


# ═════════════════════════════════════════════════════════════
# 1. User Notifications Hub (Bell Tray)
# ═════════════════════════════════════════════════════════════
@router.get("/notifications", response_model=NotificationListResponse)
def get_user_notifications(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the authenticated user's notifications with unread count badge.
    """
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).limit(limit).all()

    return NotificationListResponse(
        notifications=[NotificationResponse.from_orm(n) for n in notifications],
        unread_count=unread_count
    )


@router.patch("/notifications/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a single notification as read.
    """
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return NotificationResponse.from_orm(notif)


@router.patch("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks all notifications for the current user as read. Resets badge to 0.
    """
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "All notifications marked as read", "marked_count": count}


# ═════════════════════════════════════════════════════════════
# 2. Targeted Broadcasts & Urgent Flash Banners (Spec §4)
# ═════════════════════════════════════════════════════════════
@router.post("/broadcasts", response_model=BroadcastResponse)
def create_broadcast(
    data: BroadcastCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.TPO_ADMIN, RoleEnum.DEPT_COORDINATOR]))
):
    """
    Creates a new targeted circular or urgent flash banner.
    Enforces Coordinator Boundary:
    - Central TPO Admin: College-wide authority across all departments.
    - Department Coordinator: Strictly bound to their assigned branch (Spec §1.3).
    """
    target_depts = data.target_departments

    if current_user.role == RoleEnum.DEPT_COORDINATOR:
        coord_dept = current_user.department
        if not coord_dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coordinator account is not bound to any department."
            )
        
        # If coordinator specified any department other than their own, reject with 403
        if target_depts and any(d != coord_dept for d in target_depts):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Coordinator boundary violation: You can only broadcast announcements to your assigned department ({coord_dept})."
            )
        target_depts = [coord_dept]

    # Validate target job if provided
    job_title = None
    if data.target_job_id:
        job = db.query(JobPosting).filter(JobPosting.id == data.target_job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target job drive not found")
        job_title = job.title

    broadcast = BroadcastAnnouncement(
        sender_id=current_user.id,
        title=data.title,
        message=data.message,
        priority=data.priority,
        target_batch_year=data.target_batch_year,
        target_departments=target_depts,
        target_placement_status=data.target_placement_status,
        target_job_id=data.target_job_id,
        is_active=True,
        expires_at=data.expires_at
    )
    db.add(broadcast)
    db.commit()
    db.refresh(broadcast)

    # ─── Fan-out notification records to targeted student bell hubs ───
    students_query = db.query(User).join(StudentProfile, User.id == StudentProfile.user_id).filter(
        User.role == RoleEnum.STUDENT,
        User.is_active == True
    )

    if data.target_batch_year:
        students_query = students_query.filter(StudentProfile.graduation_year == data.target_batch_year)

    if target_depts:
        students_query = students_query.filter(StudentProfile.department.in_(target_depts))

    if data.target_placement_status == "UNPLACED_ONLY":
        students_query = students_query.filter(StudentProfile.is_placed == 0)
    elif data.target_placement_status == "PLACED_ONLY":
        students_query = students_query.filter(StudentProfile.is_placed == 1)

    if data.target_job_id:
        # Only students who applied to this job
        applicant_profile_ids = db.query(Application.student_id).filter(
            Application.job_id == data.target_job_id
        ).subquery()
        students_query = students_query.filter(StudentProfile.id.in_(applicant_profile_ids))

    targeted_students = students_query.all()

    prefix = "📢 URGENT: " if data.priority == BroadcastPriority.URGENT else "📢 Notice: "
    for s in targeted_students:
        if s.id == current_user.id:
            continue
        create_system_notification(
            db=db,
            user_id=s.id,
            title=f"{prefix}{data.title}",
            message=data.message,
            category=NotificationCategory.BROADCAST,
            action_url="/student"
        )
    db.commit()

    sender_role = current_user.role.value if isinstance(current_user.role, RoleEnum) else str(current_user.role)
    return BroadcastResponse(
        id=broadcast.id,
        sender_id=broadcast.sender_id,
        sender_name=current_user.full_name,
        sender_role=sender_role,
        title=broadcast.title,
        message=broadcast.message,
        priority=broadcast.priority,
        target_batch_year=broadcast.target_batch_year,
        target_departments=broadcast.target_departments,
        target_placement_status=broadcast.target_placement_status,
        target_job_id=broadcast.target_job_id,
        target_job_title=job_title,
        is_active=broadcast.is_active,
        expires_at=broadcast.expires_at,
        created_at=broadcast.created_at
    )


@router.get("/broadcasts", response_model=List[BroadcastResponse])
def list_broadcasts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.TPO_ADMIN, RoleEnum.DEPT_COORDINATOR]))
):
    """
    Lists all broadcast announcements created by staff.
    """
    query = db.query(BroadcastAnnouncement)
    if current_user.role == RoleEnum.DEPT_COORDINATOR:
        query = query.filter(
            or_(
                BroadcastAnnouncement.sender_id == current_user.id,
                BroadcastAnnouncement.target_departments.contains([current_user.department])
            )
        )

    broadcasts = query.order_by(desc(BroadcastAnnouncement.created_at)).all()
    results = []
    for b in broadcasts:
        sender_role = b.sender.role.value if isinstance(b.sender.role, RoleEnum) else str(b.sender.role)
        results.append(BroadcastResponse(
            id=b.id,
            sender_id=b.sender_id,
            sender_name=b.sender.full_name if b.sender else "Staff",
            sender_role=sender_role,
            title=b.title,
            message=b.message,
            priority=b.priority,
            target_batch_year=b.target_batch_year,
            target_departments=b.target_departments,
            target_placement_status=b.target_placement_status,
            target_job_id=b.target_job_id,
            target_job_title=b.job.title if b.job else None,
            is_active=b.is_active,
            expires_at=b.expires_at,
            created_at=b.created_at
        ))
    return results


@router.get("/broadcasts/active", response_model=List[BroadcastResponse])
def get_active_broadcasts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches active announcements targeted to the logged-in student (or staff).
    Includes Urgent Flash Banners (Spec §4.B).
    """
    now = datetime.utcnow()
    query = db.query(BroadcastAnnouncement).filter(
        BroadcastAnnouncement.is_active == True,
        BroadcastAnnouncement.sender_id != current_user.id,
        or_(
            BroadcastAnnouncement.expires_at == None,
            BroadcastAnnouncement.expires_at > now
        )
    )

    if current_user.role == RoleEnum.STUDENT:
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        student_dept = student_profile.department if student_profile else current_user.department
        student_batch = student_profile.graduation_year if student_profile else None
        is_placed = student_profile.is_placed if student_profile else 0

        # Applied jobs by student
        profile_id = student_profile.id if student_profile else -1
        applied_job_ids = [
            app.job_id for app in db.query(Application.job_id).filter(Application.student_id == profile_id).all()
        ]

        active_broadcasts = query.order_by(desc(BroadcastAnnouncement.priority), desc(BroadcastAnnouncement.created_at)).all()
        matching = []

        for b in active_broadcasts:
            # 1. Batch check
            if b.target_batch_year and student_batch and b.target_batch_year != student_batch:
                continue

            # 2. Department check
            if b.target_departments and student_dept:
                if student_dept not in b.target_departments:
                    continue

            # 3. Placement Status check
            if b.target_placement_status == "UNPLACED_ONLY" and is_placed == 1:
                continue
            if b.target_placement_status == "PLACED_ONLY" and is_placed == 0:
                continue

            # 4. Job Applicant check
            if b.target_job_id and b.target_job_id not in applied_job_ids:
                continue

            sender_role = b.sender.role.value if isinstance(b.sender.role, RoleEnum) else str(b.sender.role)
            matching.append(BroadcastResponse(
                id=b.id,
                sender_id=b.sender_id,
                sender_name=b.sender.full_name if b.sender else "Staff",
                sender_role=sender_role,
                title=b.title,
                message=b.message,
                priority=b.priority,
                target_batch_year=b.target_batch_year,
                target_departments=b.target_departments,
                target_placement_status=b.target_placement_status,
                target_job_id=b.target_job_id,
                target_job_title=b.job.title if b.job else None,
                is_active=b.is_active,
                expires_at=b.expires_at,
                created_at=b.created_at
            ))
        return matching

    # For staff / recruiters: return recent active broadcasts
    active_all = query.order_by(desc(BroadcastAnnouncement.created_at)).all()
    results = []
    for b in active_all:
        sender_role = b.sender.role.value if isinstance(b.sender.role, RoleEnum) else str(b.sender.role)
        results.append(BroadcastResponse(
            id=b.id,
            sender_id=b.sender_id,
            sender_name=b.sender.full_name if b.sender else "Staff",
            sender_role=sender_role,
            title=b.title,
            message=b.message,
            priority=b.priority,
            target_batch_year=b.target_batch_year,
            target_departments=b.target_departments,
            target_placement_status=b.target_placement_status,
            target_job_id=b.target_job_id,
            target_job_title=b.job.title if b.job else None,
            is_active=b.is_active,
            expires_at=b.expires_at,
            created_at=b.created_at
        ))
    return results
