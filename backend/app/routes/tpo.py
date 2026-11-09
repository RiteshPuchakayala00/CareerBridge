"""
TPO Admin Routes — Central Placement Cell Operations
Spec Reference: Section 2 (Role 1 — TPO_ADMIN)
"""
import csv
import io
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import List, Optional

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..models.batch_eligibility import BatchEligibility
from ..models.recruiter_invitation import RecruiterInvitation
from ..models.job import JobPosting, JobStatus
from ..models.application import Application, AppStatus
from ..models.company import Company
from ..schemas.rbac import (
    CoordinatorCreate, CoordinatorResponse,
    BatchEligibilityToggle, BatchEligibilityResponse,
    InviteRecruiterRequest, InviteRecruiterResponse,
    StudentListResponse, JobPostingResponse, PlacementAnalytics
)
from ..services.auth_service import get_password_hash, require_role

router = APIRouter(prefix="/api/tpo", tags=["TPO Admin"])

# ─── Dependency: Require TPO_ADMIN ───
tpo_required = require_role([RoleEnum.TPO_ADMIN])


# ═══════════════════════════════════════════════
# 1. Faculty Coordinator Governance (Spec §2.C.3)
# ═══════════════════════════════════════════════

@router.post("/coordinators", response_model=CoordinatorResponse, status_code=status.HTTP_201_CREATED)
def appoint_coordinator(
    data: CoordinatorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Appoint a DEPT_COORDINATOR and bind them to an academic department."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered in the system")
    
    raw_pwd = getattr(data, 'password', None)
    coordinator = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(raw_pwd) if raw_pwd else None,
        role=RoleEnum.DEPT_COORDINATOR,
        department=data.department.upper(),
        is_active=True,
        invited_by_id=current_user.id
    )
    db.add(coordinator)
    db.commit()
    db.refresh(coordinator)
    return coordinator


@router.get("/coordinators", response_model=List[CoordinatorResponse])
def list_coordinators(
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """List all department coordinators."""
    coordinators = db.query(User).filter(User.role == RoleEnum.DEPT_COORDINATOR).all()
    return coordinators


@router.delete("/coordinators/{coordinator_id}", status_code=status.HTTP_200_OK)
def decommission_coordinator(
    coordinator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Decommission a DEPT_COORDINATOR (soft-disable their account)."""
    coordinator = db.query(User).filter(
        User.id == coordinator_id,
        User.role == RoleEnum.DEPT_COORDINATOR
    ).first()
    if not coordinator:
        raise HTTPException(status_code=404, detail="Coordinator not found")
    
    coordinator.is_active = False
    db.commit()
    return {"message": f"Coordinator {coordinator.full_name} has been decommissioned"}


# ═══════════════════════════════════════════════
# 1b. All Users List (for admin overview)
# ═══════════════════════════════════════════════

@router.get("/users")
def list_all_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """List all system users with their roles. Optional ?role=STUDENT filter."""
    query = db.query(User)
    if role:
        try:
            role_enum = RoleEnum(role.upper())
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    users = query.order_by(User.role, User.full_name).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "department": u.department,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if hasattr(u, 'created_at') and u.created_at else None
        }
        for u in users
    ]


# ═══════════════════════════════════════════════
# 2. Dynamic Batch Eligibility Control (Spec §2.C.2)
# ═══════════════════════════════════════════════

@router.get("/batch-eligibility", response_model=List[BatchEligibilityResponse])
@router.get("/batches", response_model=List[BatchEligibilityResponse])
def list_batch_eligibility(
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """List all batch eligibility toggles (Spec §5.D)."""
    return db.query(BatchEligibility).order_by(BatchEligibility.graduation_year.desc()).all()


@router.post("/batch-eligibility", response_model=BatchEligibilityResponse)
def toggle_batch_eligibility(
    data: BatchEligibilityToggle,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Toggle login access for a specific graduation batch with granular drive-type controls."""
    batch = db.query(BatchEligibility).filter(
        BatchEligibility.graduation_year == data.graduation_year
    ).first()
    
    active_val = data.is_active if data.is_active is not None else data.is_login_allowed
    if active_val is None:
        active_val = True

    if batch:
        batch.is_active = active_val
        if data.label is not None:
            batch.label = data.label
        if data.allow_internships is not None:
            batch.allow_internships = data.allow_internships
        if data.allow_full_time is not None:
            batch.allow_full_time = data.allow_full_time
    else:
        batch = BatchEligibility(
            graduation_year=data.graduation_year,
            label=data.label or f"Batch of {data.graduation_year}",
            is_active=active_val,
            allow_internships=data.allow_internships if data.allow_internships is not None else False,
            allow_full_time=data.allow_full_time if data.allow_full_time is not None else True
        )
        db.add(batch)
    
    db.commit()
    db.refresh(batch)
    return batch


@router.patch("/batches/{year}/toggle", response_model=BatchEligibilityResponse)
def patch_batch_eligibility(
    year: int,
    data: Optional[BatchEligibilityToggle] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Toggles or updates login eligibility and drive settings for a specific batch (Spec §5.D)."""
    batch = db.query(BatchEligibility).filter(
        BatchEligibility.graduation_year == year
    ).first()
    
    if not batch:
        batch = BatchEligibility(
            graduation_year=year,
            label=f"Batch of {year}",
            is_active=True,
            allow_internships=False,
            allow_full_time=True
        )
        db.add(batch)
    else:
        if data is not None:
            active_val = data.is_active if data.is_active is not None else data.is_login_allowed
            if active_val is not None:
                batch.is_active = active_val
            if data.label is not None:
                batch.label = data.label
            if data.allow_internships is not None:
                batch.allow_internships = data.allow_internships
            if data.allow_full_time is not None:
                batch.allow_full_time = data.allow_full_time
        else:
            # Simple toggle if no payload
            batch.is_active = not batch.is_active

    db.commit()
    db.refresh(batch)
    return batch


# ═══════════════════════════════════════════════
# 3. Master Roster Management (Spec §2.C.1 & §5.D)
# ═══════════════════════════════════════════════

BLOCKED_DOMAINS = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com"}

@router.post("/upload-roster", status_code=status.HTTP_201_CREATED)
@router.post("/students/bulk-import", status_code=status.HTTP_201_CREATED)
async def upload_student_roster(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Upload official student master CSV: roll_no, full_name, email, department, graduation_year, cgpa"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    users_created = 0
    errors = []

    for row_num, row in enumerate(csv_reader, start=2):
        try:
            email = row.get("email", "").strip().lower()
            full_name = row.get("full_name", row.get("student_name", "")).strip()
            roll_number = row.get("roll_no", row.get("roll_number", "")).strip()
            department = row.get("department", "").strip().upper()
            graduation_year = row.get("graduation_year", row.get("year", "")).strip()
            cgpa = row.get("cgpa", "").strip()
            backlogs = row.get("active_backlogs", "0").strip()

            if not email or not full_name:
                errors.append(f"Row {row_num}: Missing email or full_name")
                continue

            if db.query(User).filter(sql_func.lower(User.email) == email).first():
                errors.append(f"Row {row_num}: Email {email} already exists")
                continue

            # Create User (hybrid: supports both Email+Password and Google SSO)
            pwd = row.get("password", "").strip()
            new_user = User(
                email=email,
                full_name=full_name,
                hashed_password=get_password_hash(pwd) if pwd else None,
                role=RoleEnum.STUDENT,
                department=department if department else None,
                is_active=True
            )
            db.add(new_user)
            db.flush()

            # Create StudentProfile with academic data
            student_profile = StudentProfile(
                user_id=new_user.id,
                roll_number=roll_number if roll_number else None,
                department=department if department else None,
                graduation_year=int(graduation_year) if graduation_year else None,
                cgpa=float(cgpa) if cgpa else None,
                active_backlogs=int(backlogs) if backlogs else 0
            )
            db.add(student_profile)
            users_created += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()
    
    return {
        "message": f"Successfully onboarded {users_created} students from roster.",
        "users_created": users_created,
        "errors": errors
    }


# ═══════════════════════════════════════════════
# 4. Recruiter Onboarding (Spec §2.C.4 + §4.B)
# ═══════════════════════════════════════════════

@router.post("/invite-recruiter", response_model=InviteRecruiterResponse)
def invite_recruiter(
    data: InviteRecruiterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Invite a corporate HR via email. Any email address is permitted."""
    # Check if already invited and not used
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
def list_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """List all recruiter invitations."""
    invitations = db.query(RecruiterInvitation).order_by(RecruiterInvitation.created_at.desc()).all()
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
# 5. College-Wide Student View (Spec §6: TPO sees ALL)
# ═══════════════════════════════════════════════

@router.get("/students", response_model=List[StudentListResponse])
def list_all_students(
    department: Optional[str] = None,
    graduation_year: Optional[int] = None,
    placed: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """List all students across the college with optional filters."""
    query = db.query(StudentProfile, User).join(User, StudentProfile.user_id == User.id)
    
    if department:
        query = query.filter(StudentProfile.department == department.upper())
    if graduation_year:
        query = query.filter(StudentProfile.graduation_year == graduation_year)
    if placed is not None:
        query = query.filter(StudentProfile.is_placed == (1 if placed else 0))
    
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
# 6. Job & Drive Governance (Spec §2.C.5)
# ═══════════════════════════════════════════════

@router.get("/jobs")
def list_all_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """List all jobs (pending approval + approved) with company info and lifecycle status."""
    jobs = db.query(JobPosting, Company).outerjoin(Company, JobPosting.company_id == Company.id).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "location": j.location,
            "job_type": j.job_type,
            "ctc_lpa": j.ctc_lpa,
            "eligibility_cgpa": j.eligibility_cgpa,
            "eligible_departments": j.eligible_departments,
            "max_backlogs": j.max_backlogs,
            "target_batch_year": j.target_batch_year,
            "is_approved": j.is_approved,
            "is_active": j.is_active,
            "status": j.status.value if j.status else "PENDING_APPROVAL",
            "rejection_reason": j.rejection_reason,
            "deadline": j.deadline.isoformat() if j.deadline else None,
            "drive_date": j.drive_date.isoformat() if j.drive_date else None,
            "company_name": c.company_name if c else None,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "applicant_count": db.query(Application).filter(Application.job_id == j.id).count()
        }
        for j, c in jobs
    ]


@router.put("/jobs/{job_id}/approve")
def approve_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Approve a job posting for publication → PUBLISHED."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    job.status = JobStatus.PUBLISHED
    job.is_approved = True
    job.approved_by_id = current_user.id
    job.rejection_reason = None
    db.commit()
    return {"message": f"Job '{job.title}' has been approved and published", "status": "PUBLISHED"}


@router.put("/jobs/{job_id}/reject")
def reject_job(
    job_id: int,
    reason: str = "Rejected by TPO",
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Reject/unpublish a job posting → REJECTED."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    job.status = JobStatus.REJECTED
    job.is_approved = False
    job.is_active = False
    job.rejection_reason = reason
    db.commit()
    return {"message": f"Job '{job.title}' has been rejected", "status": "REJECTED"}


# ═══════════════════════════════════════════════
# 7. College-Wide Analytics (Spec §2.C.6)
# ═══════════════════════════════════════════════

@router.get("/analytics", response_model=PlacementAnalytics)
def get_college_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Complete placement statistics for NIRF/NAAC reports."""
    total_students = db.query(StudentProfile).count()
    placed_students = db.query(StudentProfile).filter(StudentProfile.is_placed == 1).count()
    
    # Get offered applications for CTC stats
    offered_apps = db.query(Application, JobPosting).join(
        JobPosting, Application.job_id == JobPosting.id
    ).filter(Application.status == AppStatus.OFFERED).all()
    
    ctc_values = [j.ctc_lpa for _, j in offered_apps if j.ctc_lpa]
    
    # Department-wise breakdown
    dept_stats = {}
    departments = db.query(StudentProfile.department).distinct().all()
    for (dept,) in departments:
        if dept:
            dept_total = db.query(StudentProfile).filter(StudentProfile.department == dept).count()
            dept_placed = db.query(StudentProfile).filter(
                StudentProfile.department == dept,
                StudentProfile.is_placed == 1
            ).count()
            dept_stats[dept] = {
                "total": dept_total,
                "placed": dept_placed,
                "percentage": round((dept_placed / dept_total * 100), 2) if dept_total > 0 else 0
            }
    
    return PlacementAnalytics(
        total_students=total_students,
        placed_students=placed_students,
        placement_percentage=round((placed_students / total_students * 100), 2) if total_students > 0 else 0,
        total_offers=len(offered_apps),
        average_ctc=round(sum(ctc_values) / len(ctc_values), 2) if ctc_values else None,
        highest_ctc=max(ctc_values) if ctc_values else None,
        department_wise=dept_stats
    )


# ═══════════════════════════════════════════════
# 8. TPO can also manage staff (Spec §2.B)
# ═══════════════════════════════════════════════

@router.post("/staff", status_code=status.HTTP_201_CREATED)
def add_tpo_staff(
    email: str,
    full_name: str,
    password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """Add a fellow placement officer as TPO_ADMIN."""
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_staff = User(
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        role=RoleEnum.TPO_ADMIN,
        is_active=True,
        invited_by_id=current_user.id
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return {"message": f"TPO staff {full_name} added successfully", "id": new_staff.id}


@router.post("/users/{user_id}/reset-password")
def admin_reset_user_password(
    user_id: int,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(tpo_required)
):
    """
    Authoritative administrative password reset for students, coordinators, or recruiters.
    Only callable by authenticated TPO_ADMIN.
    """
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user.hashed_password = get_password_hash(new_password)
    db.commit()
    return {"message": f"Password for {target_user.email} ({target_user.full_name}) successfully reset by Admin."}

