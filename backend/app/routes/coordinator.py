"""
Department Coordinator Routes — Branch-Scoped Placement Operations
Spec Reference: Section 3 (Role 2 — DEPT_COORDINATOR)
"""
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..models.recruiter_invitation import RecruiterInvitation
from ..models.job import JobPosting, JobStatus
from ..models.company import Company
from ..models.application import Application, AppStatus
from ..schemas.rbac import (
    InviteRecruiterRequest, InviteRecruiterResponse,
    StudentListResponse, JobPostingCreate, JobPostingResponse,
    PlacementAnalytics
)
from ..services.auth_service import require_role

router = APIRouter(prefix="/api/coordinator", tags=["Department Coordinator"])

# ─── Dependency: Require DEPT_COORDINATOR ───
coordinator_required = require_role([RoleEnum.DEPT_COORDINATOR])

BLOCKED_DOMAINS = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com"}


# ═══════════════════════════════════════════════
# 1. Company Outreach & Recruiter Invitations (Spec §3.C.1)
# ═══════════════════════════════════════════════

@router.post("/invite-recruiter", response_model=InviteRecruiterResponse)
def invite_recruiter(
    data: InviteRecruiterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_required)
):
    """Coordinator invites corporate HR for campus drives in their branch."""
    domain = data.email.split("@")[1].lower()
    if domain in BLOCKED_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"Free public email domains ({domain}) are not allowed. Use a corporate email address."
        )
    
    existing = db.query(RecruiterInvitation).filter(
        RecruiterInvitation.email == data.email,
        RecruiterInvitation.is_used == False
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="An active invitation already exists for this email")
    
    invitation = RecruiterInvitation(
        email=data.email,
        company_name=data.company_name,
        token=secrets.token_urlsafe(48),
        invited_by_id=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    return {
        "message": f"Invitation generated for {data.email} ({data.company_name})",
        "invitation_id": invitation.id,
        "email": invitation.email,
        "token": invitation.token,
        "activation_url": f"/activate?token={invitation.token}"
    }


@router.get("/invitations")
def list_coordinator_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_required)
):
    """List recruiter invitations issued by this coordinator."""
    invitations = db.query(RecruiterInvitation).filter(
        RecruiterInvitation.invited_by_id == current_user.id
    ).order_by(RecruiterInvitation.created_at.desc()).all()
    return [
        {
            "id": inv.id,
            "email": inv.email,
            "company_name": inv.company_name,
            "token": inv.token,
            "is_used": inv.is_used,
            "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
            "created_at": inv.created_at.isoformat() if inv.created_at else None
        }
        for inv in invitations
    ]


# ═══════════════════════════════════════════════
# 2. Drive Initiation — Proposal for TPO Approval (Spec §3.C.2)
# ═══════════════════════════════════════════════

@router.post("/drives", status_code=status.HTTP_201_CREATED)
def propose_drive(
    data: JobPostingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_required)
):
    """Propose a new placement/internship drive for TPO approval."""
    job = JobPosting(
        title=data.title,
        description=data.description,
        location=data.location,
        job_type=data.job_type,
        ctc_lpa=data.ctc_lpa,
        stipend_monthly=data.stipend_monthly,
        eligibility_cgpa=data.eligibility_cgpa,
        eligible_departments=data.eligible_departments,
        max_backlogs=data.max_backlogs,
        drive_date=data.drive_date,
        deadline=data.deadline,
        status=JobStatus.PENDING_APPROVAL,
        is_approved=False,
        created_by_id=current_user.id,
        company_id=None
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"message": f"Drive '{data.title}' proposed for TPO approval", "job_id": job.id, "status": "PENDING_APPROVAL"}


# ═══════════════════════════════════════════════
# 3. Department-Scoped Student Supervision (Spec §3.C.3)
#    STRICT BRANCH ISOLATION: Only own department
# ═══════════════════════════════════════════════

@router.get("/students", response_model=List[StudentListResponse])
def list_department_students(
    placed: Optional[bool] = None,
    min_cgpa: Optional[float] = None,
    graduation_year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_required)
):
    """List students ONLY from the coordinator's own department."""
    if not current_user.department:
        raise HTTPException(status_code=400, detail="No department bound to your account")
    
    from sqlalchemy import func
    coord_dept = current_user.department.strip().upper()
    query = db.query(StudentProfile, User).join(
        User, StudentProfile.user_id == User.id
    ).filter(
        func.upper(StudentProfile.department) == coord_dept  # STRICT BRANCH ISOLATION
    )
    
    if placed is not None:
        query = query.filter(StudentProfile.is_placed == (1 if placed else 0))
    if min_cgpa is not None:
        query = query.filter(StudentProfile.cgpa >= min_cgpa)
    if graduation_year is not None:
        query = query.filter(StudentProfile.graduation_year == graduation_year)
    
    results = query.all()
    return [
        StudentListResponse(
            id=sp.id,
            user_id=sp.user_id,
            full_name=u.full_name,
            email=u.email,
            roll_number=sp.roll_number,
            department=sp.department,
            graduation_year=sp.graduation_year,
            cgpa=sp.cgpa,
            active_backlogs=sp.active_backlogs or 0,
            is_placed=sp.is_placed or 0,
            resume_url=sp.resume_url
        )
        for sp, u in results
    ]


# ═══════════════════════════════════════════════
# 4. Department Accreditation Exports (Spec §3.C.5)
# ═══════════════════════════════════════════════

@router.get("/analytics", response_model=PlacementAnalytics)
def get_department_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_required)
):
    """Branch-specific placement data for NBA/NAAC reviews."""
    dept = current_user.department
    if not dept:
        raise HTTPException(status_code=400, detail="No department bound to your account")
    
    total = db.query(StudentProfile).filter(StudentProfile.department == dept).count()
    placed = db.query(StudentProfile).filter(
        StudentProfile.department == dept,
        StudentProfile.is_placed == 1
    ).count()
    
    offered_apps = db.query(Application, JobPosting).join(
        JobPosting, Application.job_id == JobPosting.id
    ).join(
        StudentProfile, Application.student_id == StudentProfile.id
    ).filter(
        StudentProfile.department == dept,
        Application.status == AppStatus.OFFERED
    ).all()
    
    ctc_values = [j.ctc_lpa for _, j in offered_apps if j.ctc_lpa]
    
    return PlacementAnalytics(
        total_students=total,
        placed_students=placed,
        placement_percentage=round((placed / total * 100), 2) if total > 0 else 0,
        total_offers=len(offered_apps),
        average_ctc=round(sum(ctc_values) / len(ctc_values), 2) if ctc_values else None,
        highest_ctc=max(ctc_values) if ctc_values else None,
        department_wise={dept: {"total": total, "placed": placed}}
    )


@router.get("/drives")
def list_department_drives(
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_required)
):
    """List drives relevant to the coordinator's department."""
    dept = (current_user.department or "").strip().upper()
    jobs = db.query(JobPosting, Company).outerjoin(
        Company, JobPosting.company_id == Company.id
    ).all()
    
    # Filter jobs where the coordinator's dept is in the eligible list
    relevant = []
    for j, c in jobs:
        depts = [d.strip().upper() for d in (j.eligible_departments or []) if d]
        if dept in depts or not depts:
            relevant.append({
                "id": j.id,
                "title": j.title,
                "company_name": c.company_name if c else None,
                "ctc_lpa": j.ctc_lpa,
                "is_approved": j.is_approved,
                "status": j.status.value if j.status else "PENDING_APPROVAL",
                "drive_date": j.drive_date.isoformat() if j.drive_date else None,
                "deadline": j.deadline.isoformat() if j.deadline else None
            })
    return relevant
