"""
Messaging, Doubt Desk, Drive Logistics & FAQ Routes
Spec Reference: docs/messaging_and_inquiry_system_spec.md
- Lane 1: Student <-> Coordinator (Doubt Desk)
- Lane 2: Coordinator / TPO <-> Recruiter (Drive Logistics Chat)
- Shield Principle: Students are strictly blocked from direct recruiter contact.
- Q&A Pin-to-Drive-FAQ automation.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List, Optional

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..models.company import Company
from ..models.job import JobPosting, JobStatus
from ..models.message import MessageThread, ChatMessage, ThreadType, ThreadStatus
from ..schemas.message import (
    ThreadCreateRequest, ChatMessageCreate, ChatMessageResponse,
    MessageThreadSummary, MessageThreadDetail, ThreadStatusUpdate,
    PinFaqRequest, DriveFaqItem
)
from ..models.notification import NotificationCategory
from ..routes.notifications import create_system_notification
from ..services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/api/messages", tags=["Messaging & Doubt Desk"])


def _build_thread_summary(thread: MessageThread, current_user_id: int, db: Session) -> MessageThreadSummary:
    """Helper to populate full context for a thread summary."""
    # Student metadata context for coordinators
    student_profile = None
    if thread.student_id:
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == thread.student_id).first()
    
    student_name = thread.student.full_name if thread.student else None
    student_dept = student_profile.department if student_profile else (thread.student.department if thread.student else None)
    student_cgpa = student_profile.cgpa if student_profile else None
    student_backlogs = student_profile.active_backlogs if student_profile else None
    
    # Unread messages count for the requesting user
    unread_count = db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread.id,
        ChatMessage.sender_id != current_user_id,
        ChatMessage.is_read == False
    ).count()

    # Latest message
    last_msg = db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread.id
    ).order_by(desc(ChatMessage.created_at)).first()

    company_name = None
    if thread.job and thread.job.company:
        company_name = thread.job.company.company_name
    elif thread.recruiter_id:
        rec_comp = db.query(Company).filter(Company.user_id == thread.recruiter_id).first()
        if rec_comp:
            company_name = rec_comp.company_name

    return MessageThreadSummary(
        id=thread.id,
        job_id=thread.job_id,
        job_title=thread.job.title if thread.job else "General Placement Query",
        company_name=company_name,
        thread_type=thread.thread_type,
        subject=thread.subject,
        status=thread.status,
        student_id=thread.student_id,
        student_name=student_name,
        student_dept=student_dept,
        student_cgpa=student_cgpa,
        student_backlogs=student_backlogs,
        coordinator_id=thread.coordinator_id,
        coordinator_name=thread.coordinator.full_name if thread.coordinator else None,
        recruiter_id=thread.recruiter_id,
        recruiter_name=thread.recruiter.full_name if thread.recruiter else None,
        is_pinned_faq=thread.is_pinned_faq,
        faq_question=thread.faq_question,
        faq_answer=thread.faq_answer,
        unread_count=unread_count,
        last_message=last_msg.content if last_msg else None,
        last_message_at=last_msg.created_at if last_msg else thread.created_at,
        created_at=thread.created_at,
        updated_at=thread.updated_at
    )


# ═══════════════════════════════════════════════════════
# 1. Create a Thread (POST /api/messages/threads)
# ═══════════════════════════════════════════════════════
@router.post("/threads", response_model=MessageThreadDetail)
def create_thread(
    data: ThreadCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Starts a new thread.
    - STUDENT: Starts a Doubt Desk query (Lane 1) to Department Coordinator.
      Strictly forbidden from creating recruiter threads or messaging recruiters! (Shield Principle §1)
    - COORDINATOR / TPO: Can start drive logistics thread with Recruiter (Lane 2) or student doubt.
    - RECRUITER: Can start drive logistics chat with Coordinator/TPO (Lane 2). Forbidden from messaging students!
    """
    # 1. Enforce Shield Principle
    if current_user.role == RoleEnum.STUDENT:
        if data.thread_type == ThreadType.COORDINATOR_RECRUITER or data.recruiter_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The Shield Principle: Students are strictly not permitted to message recruiters directly. Inquiries must be routed to your Department Coordinator."
            )
        data.thread_type = ThreadType.STUDENT_COORDINATOR
        student_id = current_user.id
        recruiter_id = None
        
        # Determine coordinator: check department or job
        coordinator_id = data.coordinator_id
        if not coordinator_id:
            # Check student department coordinator
            dept = current_user.department
            if not dept:
                sp = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
                if sp and sp.department:
                    dept = sp.department
            
            coord = None
            if dept:
                coord = db.query(User).filter(
                    User.role == RoleEnum.DEPT_COORDINATOR,
                    User.department == dept,
                    User.is_active == True
                ).first()
            if not coord:
                coord = db.query(User).filter(
                    User.role.in_([RoleEnum.DEPT_COORDINATOR, RoleEnum.TPO_ADMIN]),
                    User.is_active == True
                ).first()
            if coord:
                coordinator_id = coord.id

    elif current_user.role == RoleEnum.RECRUITER:
        if data.thread_type == ThreadType.STUDENT_COORDINATOR or data.student_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Recruiters must communicate directly with College Department Coordinators or TPO staff."
            )
        data.thread_type = ThreadType.COORDINATOR_RECRUITER
        recruiter_id = current_user.id
        student_id = None
        coordinator_id = data.coordinator_id
        
        # If coordinator not specified, assign TPO or drive coordinator
        if not coordinator_id and data.job_id:
            job = db.query(JobPosting).filter(JobPosting.id == data.job_id).first()
            if job and job.approved_by_id:
                coordinator_id = job.approved_by_id
        if not coordinator_id:
            tpo_or_coord = db.query(User).filter(
                User.role.in_([RoleEnum.TPO_ADMIN, RoleEnum.DEPT_COORDINATOR]),
                User.is_active == True
            ).first()
            if tpo_or_coord:
                coordinator_id = tpo_or_coord.id

    elif current_user.role in [RoleEnum.DEPT_COORDINATOR, RoleEnum.TPO_ADMIN]:
        coordinator_id = current_user.id
        if data.thread_type == ThreadType.COORDINATOR_RECRUITER:
            student_id = None
            recruiter_id = data.recruiter_id
            if not recruiter_id and data.job_id:
                job = db.query(JobPosting).filter(JobPosting.id == data.job_id).first()
                if job and job.created_by_id:
                    recruiter_id = job.created_by_id
            if not recruiter_id:
                recruiter = db.query(User).filter(User.role == RoleEnum.RECRUITER, User.is_active == True).first()
                if recruiter:
                    recruiter_id = recruiter.id
        else:
            student_id = data.student_id  # If coordinator initiates doubt to student
            recruiter_id = None
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized role")

    # Validate job if supplied
    if data.job_id:
        job = db.query(JobPosting).filter(JobPosting.id == data.job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")

    new_thread = MessageThread(
        job_id=data.job_id,
        thread_type=data.thread_type,
        student_id=student_id,
        coordinator_id=coordinator_id,
        recruiter_id=recruiter_id,
        subject=data.subject,
        status=ThreadStatus.OPEN
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)

    # Add initial message if provided
    initial_msg = data.initial_message or data.subject
    first_chat_msg = ChatMessage(
        thread_id=new_thread.id,
        sender_id=current_user.id,
        content=initial_msg,
        attachment_url=data.attachment_url,
        is_read=False
    )
    db.add(first_chat_msg)
    db.commit()
    db.refresh(first_chat_msg)

    # Recruiter company lookup
    sender_comp = None
    if current_user.role == RoleEnum.RECRUITER:
        rc = db.query(Company).filter(Company.user_id == current_user.id).first()
        if rc:
            sender_comp = rc.company_name

    # Notify coordinator when recruiter creates thread
    if new_thread.thread_type == ThreadType.COORDINATOR_RECRUITER and current_user.role == RoleEnum.RECRUITER and new_thread.coordinator_id:
        comp_tag = f" ({sender_comp})" if sender_comp else ""
        create_system_notification(
            db=db,
            user_id=new_thread.coordinator_id,
            title=f"💬 New Query from Recruiter: {current_user.full_name}{comp_tag}",
            message=f"{new_thread.subject} - {initial_msg[:120]}",
            category=NotificationCategory.INQUIRY_REPLY,
            action_url="/coordinator"
        )
        db.commit()

    summary = _build_thread_summary(new_thread, current_user.id, db)
    return MessageThreadDetail(
        **summary.dict(),
        messages=[
            ChatMessageResponse(
                id=first_chat_msg.id,
                thread_id=first_chat_msg.thread_id,
                sender_id=first_chat_msg.sender_id,
                sender_name=current_user.full_name,
                sender_role=current_user.role.value if isinstance(current_user.role, RoleEnum) else str(current_user.role),
                sender_company=sender_comp,
                content=first_chat_msg.content,
                attachment_url=first_chat_msg.attachment_url,
                is_read=first_chat_msg.is_read,
                created_at=first_chat_msg.created_at
            )
        ]
    )


# ═══════════════════════════════════════════════════════
# 2. List User's Active Threads (GET /api/messages/threads)
# ═══════════════════════════════════════════════════════
@router.get("/threads", response_model=List[MessageThreadSummary])
def list_threads(
    job_id: Optional[int] = Query(None),
    thread_type: Optional[ThreadType] = Query(None),
    thread_status: Optional[ThreadStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists active threads visible to the user with unread counts and student academic context.
    """
    query = db.query(MessageThread)

    if job_id:
        query = query.filter(MessageThread.job_id == job_id)
    if thread_type:
        query = query.filter(MessageThread.thread_type == thread_type)
    if thread_status:
        query = query.filter(MessageThread.status == thread_status)

    # Role-based visibility scoping
    if current_user.role == RoleEnum.STUDENT:
        query = query.filter(
            MessageThread.thread_type == ThreadType.STUDENT_COORDINATOR,
            MessageThread.student_id == current_user.id
        )
    elif current_user.role == RoleEnum.RECRUITER:
        query = query.filter(
            MessageThread.thread_type == ThreadType.COORDINATOR_RECRUITER,
            or_(
                MessageThread.recruiter_id == current_user.id,
                MessageThread.job.has(JobPosting.created_by_id == current_user.id)
            )
        )
    elif current_user.role == RoleEnum.DEPT_COORDINATOR:
        # Coordinators can see both Lane 1 (for their department or all student inquiries) and Lane 2
        # If thread is student-coordinator, prioritize their branch
        pass  # Coordinators and TPO admins have access to all drives/doubts
    elif current_user.role == RoleEnum.TPO_ADMIN:
        pass  # TPO has global oversight

    threads = query.order_by(desc(MessageThread.updated_at)).all()
    return [_build_thread_summary(t, current_user.id, db) for t in threads]


# ═══════════════════════════════════════════════════════
# 3. Get Thread Details & Read All (GET /api/messages/threads/{id})
# ═══════════════════════════════════════════════════════
@router.get("/threads/{thread_id}", response_model=MessageThreadDetail)
def get_thread_detail(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches full thread conversation history and marks incoming messages as read.
    """
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    # Check permission
    if current_user.role == RoleEnum.STUDENT and thread.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this thread")
    if current_user.role == RoleEnum.RECRUITER:
        if thread.thread_type != ThreadType.COORDINATOR_RECRUITER:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Shield principle: Recruiters cannot view student doubt threads")
        if thread.recruiter_id != current_user.id and (thread.job and thread.job.created_by_id != current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this thread")

    # Mark incoming messages as read
    db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread.id,
        ChatMessage.sender_id != current_user.id,
        ChatMessage.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()

    summary = _build_thread_summary(thread, current_user.id, db)

    # Fetch messages ordered
    chat_msgs = db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread.id
    ).order_by(ChatMessage.created_at).all()

    thread_company_name = summary.company_name
    msg_responses = []
    for m in chat_msgs:
        sender_role = m.sender.role.value if isinstance(m.sender.role, RoleEnum) else str(m.sender.role)
        sender_comp = None
        if m.sender.role == RoleEnum.RECRUITER:
            sender_comp = thread_company_name
            if not sender_comp:
                rc = db.query(Company).filter(Company.user_id == m.sender_id).first()
                if rc:
                    sender_comp = rc.company_name
        msg_responses.append(ChatMessageResponse(
            id=m.id,
            thread_id=m.thread_id,
            sender_id=m.sender_id,
            sender_name=m.sender.full_name,
            sender_role=sender_role,
            sender_company=sender_comp,
            content=m.content,
            attachment_url=m.attachment_url,
            is_read=m.is_read,
            created_at=m.created_at
        ))

    return MessageThreadDetail(
        **summary.dict(),
        messages=msg_responses
    )


# ═══════════════════════════════════════════════════════
# 4. Reply to Thread (POST /api/messages/threads/{id}/messages)
# ═══════════════════════════════════════════════════════
@router.post("/threads/{thread_id}/messages", response_model=ChatMessageResponse)
def send_message(
    thread_id: int,
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sends a new reply message in an active thread.
    """
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    # Access check
    if current_user.role == RoleEnum.STUDENT and thread.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot reply to someone else's inquiry")
    if current_user.role == RoleEnum.RECRUITER:
        if thread.thread_type != ThreadType.COORDINATOR_RECRUITER:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiters cannot reply to student doubt threads")
        if thread.recruiter_id != current_user.id and (thread.job and thread.job.created_by_id != current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to reply to this thread")

    new_msg = ChatMessage(
        thread_id=thread.id,
        sender_id=current_user.id,
        content=data.content,
        attachment_url=data.attachment_url,
        is_read=False
    )
    db.add(new_msg)

    # Refresh thread updated_at and reopen if closed
    thread.updated_at = datetime.utcnow()
    if thread.status == ThreadStatus.RESOLVED and current_user.role == RoleEnum.STUDENT:
        thread.status = ThreadStatus.OPEN

    db.commit()
    db.refresh(new_msg)

    # Emit real-time notification to student when coordinator/TPO replies
    if thread.thread_type == ThreadType.STUDENT_COORDINATOR and thread.student_id and current_user.id != thread.student_id:
        create_system_notification(
            db=db,
            user_id=thread.student_id,
            title="Coordinator Replied to Your Inquiry",
            message=f"{current_user.full_name}: {data.content[:120]}",
            category=NotificationCategory.INQUIRY_REPLY,
            action_url="/student"
        )
        db.commit()

    # Emit real-time notification to coordinator when recruiter replies
    if thread.thread_type == ThreadType.COORDINATOR_RECRUITER and current_user.role == RoleEnum.RECRUITER and thread.coordinator_id:
        rc = db.query(Company).filter(Company.user_id == current_user.id).first()
        comp_tag = f" ({rc.company_name})" if rc and rc.company_name else ""
        create_system_notification(
            db=db,
            user_id=thread.coordinator_id,
            title=f"💬 Message from Recruiter: {current_user.full_name}{comp_tag}",
            message=f"{current_user.full_name}{comp_tag}: {data.content[:120]}",
            category=NotificationCategory.INQUIRY_REPLY,
            action_url="/coordinator"
        )
        db.commit()

    sender_role = current_user.role.value if isinstance(current_user.role, RoleEnum) else str(current_user.role)
    sender_comp = None
    if current_user.role == RoleEnum.RECRUITER:
        rc = db.query(Company).filter(Company.user_id == current_user.id).first()
        if rc:
            sender_comp = rc.company_name

    return ChatMessageResponse(
        id=new_msg.id,
        thread_id=new_msg.thread_id,
        sender_id=new_msg.sender_id,
        sender_name=current_user.full_name,
        sender_role=sender_role,
        sender_company=sender_comp,
        content=new_msg.content,
        attachment_url=new_msg.attachment_url,
        is_read=new_msg.is_read,
        created_at=new_msg.created_at
    )


# ═══════════════════════════════════════════════════════
# 5. Toggle Status (PATCH /api/messages/threads/{id}/status)
# ═══════════════════════════════════════════════════════
@router.patch("/threads/{thread_id}/status", response_model=MessageThreadSummary)
def update_thread_status(
    thread_id: int,
    data: ThreadStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Toggles status between OPEN and RESOLVED.
    """
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    if current_user.role == RoleEnum.STUDENT and thread.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    thread.status = data.status
    thread.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(thread)

    return _build_thread_summary(thread, current_user.id, db)


# ═══════════════════════════════════════════════════════
# 6. Pin to Drive FAQ (POST /api/messages/threads/{id}/pin-faq)
# ═══════════════════════════════════════════════════════
@router.post("/threads/{thread_id}/pin-faq", response_model=MessageThreadSummary)
def pin_thread_to_faq(
    thread_id: int,
    data: PinFaqRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.DEPT_COORDINATOR, RoleEnum.TPO_ADMIN]))
):
    """
    Spec §2.C: Pin to Drive FAQ Automation.
    Promotes a student-coordinator doubt resolution into a public FAQ for all eligible candidates.
    """
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    if not thread.job_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot pin a general placement query as a Drive FAQ without an associated Job ID."
        )

    # Determine FAQ Question
    faq_q = data.faq_question
    if not faq_q or not faq_q.strip():
        faq_q = thread.subject

    # Determine FAQ Answer
    faq_a = data.faq_answer
    if not faq_a or not faq_a.strip():
        # Find latest answer from coordinator / TPO
        last_staff_msg = db.query(ChatMessage).join(User, ChatMessage.sender_id == User.id).filter(
            ChatMessage.thread_id == thread.id,
            User.role.in_([RoleEnum.DEPT_COORDINATOR, RoleEnum.TPO_ADMIN])
        ).order_by(desc(ChatMessage.created_at)).first()

        if last_staff_msg:
            faq_a = last_staff_msg.content
        else:
            # Fallback to latest message in thread
            last_msg = db.query(ChatMessage).filter(
                ChatMessage.thread_id == thread.id
            ).order_by(desc(ChatMessage.created_at)).first()
            faq_a = last_msg.content if last_msg else "Resolved by Coordinator."

    thread.is_pinned_faq = True
    thread.faq_question = faq_q
    thread.faq_answer = faq_a
    thread.status = ThreadStatus.RESOLVED
    thread.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(thread)

    return _build_thread_summary(thread, current_user.id, db)


faqs_router = APIRouter(prefix="/api/jobs", tags=["Drive FAQs"])

# ═══════════════════════════════════════════════════════
# 7. Drive FAQs (GET /api/jobs/{job_id}/faqs)
# ═══════════════════════════════════════════════════════
@router.get("/jobs/{job_id}/faqs", response_model=List[DriveFaqItem])
@faqs_router.get("/{job_id}/faqs", response_model=List[DriveFaqItem])
def get_job_faqs(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches all published/pinned FAQs for a given job posting.
    Accessible to all logged-in roles (students, coordinators, recruiters, TPO).
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")

    faqs = db.query(MessageThread).filter(
        MessageThread.job_id == job_id,
        MessageThread.is_pinned_faq == True
    ).order_by(desc(MessageThread.updated_at)).all()

    return [
        DriveFaqItem(
            id=f.id,
            thread_id=f.id,
            job_id=f.job_id,
            question=f.faq_question or f.subject,
            answer=f.faq_answer or "No answer provided yet.",
            created_at=f.updated_at or f.created_at
        )
        for f in faqs
    ]
