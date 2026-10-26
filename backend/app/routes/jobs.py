"""
Centralized Job Lifecycle & Eligibility Engine Routes
Spec Reference: job_lifecycle_and_eligibility_engine_spec.md

Implements:
  - Job CRUD (create, list, detail)
  - Coordinator/TPO Approval Pipeline (approve / reject)
  - 5-Rule Eligibility Engine (Tier 1: visual badges + Tier 2: hard gate)
  - One-Offer Policy enforcement
  - Student apply with hard security gate
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..models.company import Company
from ..models.job import JobPosting, JobStatus
from ..models.application import Application, AppStatus
from ..models.job_round import JobRound, RoundType
from ..models.batch_eligibility import BatchEligibility
from ..schemas.round import (
    JobRoundCreate, JobRoundsBatchCreate, JobRoundLogisticsUpdate,
    CandidateSlotAssignment, RoundShortlistRequest, JobRoundResponse
)
from ..models.notification import NotificationCategory
from ..routes.notifications import create_system_notification
from ..services.auth_service import require_role, get_current_user


router = APIRouter(prefix="/api/jobs", tags=["Job Lifecycle & Eligibility Engine"])


# ─── Schemas ───

class JobCreateRequest(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    job_type: str = "Full-Time"
    ctc_lpa: Optional[float] = None
    stipend_monthly: Optional[float] = None
    eligibility_cgpa: float = 0.0
    eligible_departments: List[str] = []
    max_backlogs: int = 0
    target_batch_year: Optional[int] = None
    drive_date: Optional[datetime] = None
    deadline: Optional[datetime] = None


class JobRejectRequest(BaseModel):
    reason: str


class JobDetailResponse(BaseModel):
    id: int
    title: str
    description: str
    company_name: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    ctc_lpa: Optional[float] = None
    stipend_monthly: Optional[float] = None
    eligibility_cgpa: float = 0.0
    eligible_departments: Optional[List[str]] = None
    max_backlogs: int = 0
    target_batch_year: Optional[int] = None
    deadline: Optional[str] = None
    drive_date: Optional[str] = None
    status: str = "PENDING_APPROVAL"
    rejection_reason: Optional[str] = None
    created_at: Optional[str] = None
    applicant_count: int = 0
    # Student-specific eligibility info (Tier 1: Visual Badges)
    is_eligible: Optional[bool] = None
    eligibility_reasons: Optional[List[str]] = None
    has_applied: Optional[bool] = None


# ═══════════════════════════════════════════════
#  5-Rule Eligibility Engine (Core Logic)
# ═══════════════════════════════════════════════

def evaluate_eligibility(student: StudentProfile, job: JobPosting, db: Session) -> tuple:
    """
    Evaluates the 5-rule eligibility engine for a student against a job.
    Returns (is_eligible: bool, reasons: list[str])
    
    Rule 1: One-Offer Rule (already placed?)
    Rule 2: Job Status & Deadline Check
    Rule 3: CGPA Cutoff Check
    Rule 4: Department / Branch Check
    Rule 5: Backlogs Allowance Check
    """
    reasons = []
    
    # ─── Rule 1: One-Offer Rule (Single-Offer Enforcement) ───
    if student.is_placed == 1:
        # Find the company they are placed at
        placed_app = db.query(Application, JobPosting, Company).join(
            JobPosting, Application.job_id == JobPosting.id
        ).outerjoin(
            Company, JobPosting.company_id == Company.id
        ).filter(
            Application.student_id == student.id,
            Application.status == AppStatus.OFFERED
        ).first()
        
        company_name = "a company"
        if placed_app:
            _, _, comp = placed_app
            if comp:
                company_name = comp.company_name
        
        reasons.append(
            f"Ineligible: You have already secured an offer with {company_name}. "
            f"Under college placement policy, placed students cannot participate in further drives."
        )
        return False, reasons
    
    # ─── Rule 2: Job Status & Deadline Check ───
    if job.status != JobStatus.PUBLISHED:
        reasons.append(f"Ineligible: This drive is not currently active (status: {job.status.value}).")
        return False, reasons
    
    now = datetime.now(timezone.utc)
    if job.deadline:
        deadline_aware = job.deadline.replace(tzinfo=timezone.utc) if job.deadline.tzinfo is None else job.deadline
        if now > deadline_aware:
            reasons.append(
                f"Ineligible: Application deadline ({job.deadline.strftime('%Y-%m-%d %H:%M')}) "
                f"for this drive has expired."
            )
            return False, reasons
    
    # ─── Rule 3: CGPA Cutoff Check ───
    if job.eligibility_cgpa and job.eligibility_cgpa > 0:
        student_cgpa = student.cgpa or 0.0
        if student_cgpa < job.eligibility_cgpa:
            reasons.append(
                f"Ineligible: Requires minimum {job.eligibility_cgpa} CGPA, "
                f"but your current CGPA is {student_cgpa}."
            )
    
    # ─── Rule 4: Department / Branch Check ───
    if job.eligible_departments and len(job.eligible_departments) > 0:
        if student.department and student.department not in job.eligible_departments:
            reasons.append(
                f"Ineligible: Drive is open only for [{', '.join(job.eligible_departments)}]. "
                f"Your department is {student.department}."
            )
    
    # ─── Rule 5: Backlogs Allowance Check ───
    if job.max_backlogs is not None:
        student_backlogs = student.active_backlogs or 0
        if student_backlogs > job.max_backlogs:
            reasons.append(
                f"Ineligible: Company allows a maximum of {job.max_backlogs} active backlog(s), "
                f"but you currently have {student_backlogs} active backlog(s)."
            )
    
    is_eligible = len(reasons) == 0
    return is_eligible, reasons


def serialize_job(job: JobPosting, company: Company = None, applicant_count: int = 0,
                  is_eligible: bool = None, eligibility_reasons: list = None,
                  has_applied: bool = None) -> dict:
    """Serialize a job posting into the standard response dict."""
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "company_name": company.company_name if company else None,
        "location": job.location,
        "job_type": job.job_type,
        "ctc_lpa": job.ctc_lpa,
        "stipend_monthly": job.stipend_monthly,
        "eligibility_cgpa": job.eligibility_cgpa or 0.0,
        "eligible_departments": job.eligible_departments,
        "max_backlogs": job.max_backlogs or 0,
        "target_batch_year": job.target_batch_year,
        "deadline": job.deadline.isoformat() if job.deadline else None,
        "drive_date": job.drive_date.isoformat() if job.drive_date else None,
        "status": job.status.value if job.status else "PENDING_APPROVAL",
        "rejection_reason": job.rejection_reason,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "applicant_count": applicant_count,
        "is_eligible": is_eligible,
        "eligibility_reasons": eligibility_reasons,
        "has_applied": has_applied,
    }


# ═══════════════════════════════════════════════
#  1. CREATE Job Posting (Recruiter / TPO)
#     Status → PENDING_APPROVAL
# ═══════════════════════════════════════════════

recruiter_or_tpo = require_role([RoleEnum.RECRUITER, RoleEnum.TPO_ADMIN])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_job(
    data: JobCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_or_tpo)
):
    """Recruiter or TPO creates a job → saved with status PENDING_APPROVAL."""
    company = None
    if current_user.role == RoleEnum.RECRUITER:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company:
            raise HTTPException(status_code=400, detail="Complete your company profile first")
    
    job = JobPosting(
        company_id=company.id if company else None,
        created_by_id=current_user.id,
        title=data.title,
        description=data.description,
        location=data.location,
        job_type=data.job_type,
        ctc_lpa=data.ctc_lpa,
        stipend_monthly=data.stipend_monthly,
        eligibility_cgpa=data.eligibility_cgpa,
        eligible_departments=data.eligible_departments,
        max_backlogs=data.max_backlogs,
        target_batch_year=data.target_batch_year,
        drive_date=data.drive_date,
        deadline=data.deadline,
        status=JobStatus.PENDING_APPROVAL,
        is_approved=False,
        is_active=True
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    return {
        "message": f"Job '{data.title}' submitted for approval",
        "job_id": job.id,
        "status": job.status.value
    }


# ═══════════════════════════════════════════════
#  2. PENDING DRIVES — Coordinator/TPO Dashboard
# ═══════════════════════════════════════════════

approver_required = require_role([RoleEnum.DEPT_COORDINATOR, RoleEnum.TPO_ADMIN])

@router.get("/pending")
def list_pending_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(approver_required)
):
    """Coordinator views jobs awaiting review for their branch. TPO sees all."""
    query = db.query(JobPosting, Company).outerjoin(
        Company, JobPosting.company_id == Company.id
    ).filter(JobPosting.status == JobStatus.PENDING_APPROVAL)
    
    # Coordinators only see jobs relevant to their department
    if current_user.role == RoleEnum.DEPT_COORDINATOR and current_user.department:
        # Filter where coordinator's dept is in eligible_departments
        results = []
        for job, company in query.all():
            depts = job.eligible_departments or []
            if current_user.department in depts or not depts:
                count = db.query(Application).filter(Application.job_id == job.id).count()
                results.append(serialize_job(job, company, applicant_count=count))
        return results
    
    # TPO sees all pending
    results = []
    for job, company in query.all():
        count = db.query(Application).filter(Application.job_id == job.id).count()
        results.append(serialize_job(job, company, applicant_count=count))
    return results


# ═══════════════════════════════════════════════
#  3. APPROVE Job → Status: PUBLISHED
# ═══════════════════════════════════════════════

@router.patch("/{job_id}/approve")
def approve_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(approver_required)
):
    """Approves a job → status changes to PUBLISHED (live for students)."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    if job.status != JobStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve a job with status '{job.status.value}'. Only PENDING_APPROVAL jobs can be approved."
        )
    
    # Department coordinators can only approve jobs relevant to their department
    if current_user.role == RoleEnum.DEPT_COORDINATOR and current_user.department:
        depts = job.eligible_departments or []
        if depts and current_user.department not in depts:
            raise HTTPException(
                status_code=403,
                detail=f"You can only approve jobs for your department ({current_user.department})"
            )
    
    job.status = JobStatus.PUBLISHED
    job.is_approved = True
    job.approved_by_id = current_user.id
    job.rejection_reason = None
    db.commit()
    
    return {
        "message": f"Job '{job.title}' has been approved and published",
        "status": JobStatus.PUBLISHED.value
    }


# ═══════════════════════════════════════════════
#  4. REJECT Job → Status: REJECTED with feedback
# ═══════════════════════════════════════════════

@router.patch("/{job_id}/reject")
def reject_job(
    job_id: int,
    data: JobRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(approver_required)
):
    """Rejects a job with feedback reason."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    if job.status not in (JobStatus.PENDING_APPROVAL, JobStatus.PUBLISHED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject a job with status '{job.status.value}'."
        )
    
    job.status = JobStatus.REJECTED
    job.is_approved = False
    job.is_active = False
    job.rejection_reason = data.reason
    db.commit()
    
    return {
        "message": f"Job '{job.title}' has been rejected",
        "reason": data.reason,
        "status": JobStatus.REJECTED.value
    }


# ═══════════════════════════════════════════════
#  5. CLOSE Job → Status: CLOSED
# ═══════════════════════════════════════════════

@router.patch("/{job_id}/close")
def close_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(approver_required)
):
    """Close a published job (deadline reached or drive concluded)."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    job.status = JobStatus.CLOSED
    job.is_active = False
    db.commit()
    
    return {"message": f"Job '{job.title}' has been closed", "status": JobStatus.CLOSED.value}


# ═══════════════════════════════════════════════
#  6. LIST ALL JOBS (All Roles)
#     For STUDENT: includes Tier 1 eligibility badges
# ═══════════════════════════════════════════════

@router.get("")
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists jobs. For STUDENT, returns personalized eligibility tags (is_eligible, reasons).
    - Students only see PUBLISHED jobs.
    - Coordinators/TPO see all jobs.
    - Recruiters see their own jobs.
    """
    
    if current_user.role == RoleEnum.STUDENT:
        return _list_jobs_for_student(db, current_user)
    
    if current_user.role == RoleEnum.RECRUITER:
        return _list_jobs_for_recruiter(db, current_user)
    
    # TPO / Coordinator — see everything
    return _list_jobs_for_admin(db, current_user)


def _list_jobs_for_student(db: Session, user: User):
    """Tier 1: Dynamic Visual Badges — compute eligibility on-the-fly."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Only PUBLISHED jobs visible to students
    jobs_query = db.query(JobPosting, Company).outerjoin(
        Company, JobPosting.company_id == Company.id
    ).filter(JobPosting.status == JobStatus.PUBLISHED)
    
    # Get student's existing applications
    applied_job_ids = set(
        app.job_id for app in db.query(Application.job_id).filter(
            Application.student_id == profile.id
        ).all()
    )
    
    results = []
    student_dept = (profile.department or "").strip().upper()

    for job, company in jobs_query.all():
        # ─── Strict Branch Isolation Filter ───
        # Students should ONLY see companies/drives that target their branch.
        if job.eligible_departments and len(job.eligible_departments) > 0:
            job_depts = [d.strip().upper() for d in job.eligible_departments if d]
            if student_dept and student_dept not in job_depts:
                continue

        is_eligible, reasons = evaluate_eligibility(profile, job, db)
        has_applied = job.id in applied_job_ids
        
        results.append(serialize_job(
            job, company,
            is_eligible=is_eligible,
            eligibility_reasons=reasons if reasons else None,
            has_applied=has_applied
        ))
    
    return results


def _list_jobs_for_recruiter(db: Session, user: User):
    """Recruiter sees only their own company's jobs."""
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        return []
    
    jobs = db.query(JobPosting).filter(JobPosting.company_id == company.id).all()
    results = []
    for job in jobs:
        count = db.query(Application).filter(Application.job_id == job.id).count()
        results.append(serialize_job(job, company, applicant_count=count))
    return results


def _list_jobs_for_admin(db: Session, user: User):
    """TPO/Coordinator sees all jobs."""
    query = db.query(JobPosting, Company).outerjoin(
        Company, JobPosting.company_id == Company.id
    )
    
    # Coordinators: filter to relevant departments
    if user.role == RoleEnum.DEPT_COORDINATOR and user.department:
        all_jobs = query.all()
        results = []
        for job, company in all_jobs:
            depts = job.eligible_departments or []
            if user.department in depts or not depts:
                count = db.query(Application).filter(Application.job_id == job.id).count()
                results.append(serialize_job(job, company, applicant_count=count))
        return results
    
    # TPO: see all
    results = []
    for job, company in query.order_by(JobPosting.created_at.desc()).all():
        count = db.query(Application).filter(Application.job_id == job.id).count()
        results.append(serialize_job(job, company, applicant_count=count))
    return results


# ═══════════════════════════════════════════════
#  7. JOB DETAIL (All Roles)
#     For STUDENT: full eligibility breakdown
# ═══════════════════════════════════════════════

@router.get("/{job_id}")
def get_job_detail(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Full drive details + student eligibility status breakdown."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    company = None
    if job.company_id:
        company = db.query(Company).filter(Company.id == job.company_id).first()
    
    count = db.query(Application).filter(Application.job_id == job.id).count()
    
    # For students, include eligibility
    is_eligible = None
    reasons = None
    has_applied = None
    
    if current_user.role == RoleEnum.STUDENT:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if profile:
            is_eligible, reasons = evaluate_eligibility(profile, job, db)
            existing = db.query(Application).filter(
                Application.student_id == profile.id,
                Application.job_id == job_id
            ).first()
            has_applied = existing is not None
    
    return serialize_job(
        job, company, applicant_count=count,
        is_eligible=is_eligible,
        eligibility_reasons=reasons if reasons else None,
        has_applied=has_applied
    )


# ═══════════════════════════════════════════════
#  8. APPLY TO JOB (Student Only)
#     Tier 2: Hard Security Gate — re-runs all 5 rules
# ═══════════════════════════════════════════════

student_required = require_role([RoleEnum.STUDENT])

@router.post("/{job_id}/apply", status_code=status.HTTP_201_CREATED)
def apply_to_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(student_required)
):
    """
    Tier 2: Hard Security Gate.
    Independently re-runs all 5 eligibility rules from verified database records.
    Direct API tampering (Postman/curl) is completely impossible.
    """
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # ─── Tier 2: Re-run full 5-rule engine ───
    is_eligible, reasons = evaluate_eligibility(profile, job, db)
    
    if not is_eligible:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Eligibility check failed",
                "reasons": reasons
            }
        )
    
    # Check for batch drive-type enforcement
    if profile.graduation_year:
        batch = db.query(BatchEligibility).filter(
            BatchEligibility.graduation_year == profile.graduation_year
        ).first()
        if batch:
            is_internship = "intern" in (job.job_type or "").lower()
            if is_internship and not batch.allow_internships:
                raise HTTPException(
                    status_code=403,
                    detail=f"Ineligible: Internship drives are not active for the {profile.graduation_year} batch"
                )
            if not is_internship and not batch.allow_full_time:
                raise HTTPException(
                    status_code=403,
                    detail=f"Ineligible: Full-time drives are not active for the {profile.graduation_year} batch"
                )
    
    # Check duplicate application
    existing = db.query(Application).filter(
        Application.student_id == profile.id,
        Application.job_id == job_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this job")
    
    # Compute AI Match Score
    match_score = 78.0
    if profile.skills_list and job.description:
        job_corpus = f"{job.title} {job.description}".lower()
        matched = [s for s in profile.skills_list if str(s).lower() in job_corpus]
        ratio = len(matched) / max(len(profile.skills_list), 1)
        match_score = round(min(97.0, 65.0 + (ratio * 30.0)), 1)
    elif profile.skills_list:
        match_score = 82.0
    
    # Automatically link to Round 1 if configured
    round_1 = db.query(JobRound).filter(
        JobRound.job_id == job_id,
        JobRound.round_number == 1
    ).first()

    application = Application(
        student_id=profile.id,
        job_id=job_id,
        status=AppStatus.IN_PROGRESS if round_1 else AppStatus.APPLIED,
        current_round_id=round_1.id if round_1 else None,
        ai_match_score=match_score
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    
    return {
        "message": "Application submitted successfully",
        "application_id": application.id,
        "ai_match_score": match_score,
        "current_round_id": application.current_round_id
    }


# ═══════════════════════════════════════════════
#  9. DYNAMIC INTERVIEW ROUNDS & SHORTLISTING
#     Spec: interview_rounds_and_shortlisting_spec.md
# ═══════════════════════════════════════════════

recruiter_or_admin = require_role([RoleEnum.RECRUITER, RoleEnum.TPO_ADMIN, RoleEnum.DEPT_COORDINATOR])
recruiter_only = require_role([RoleEnum.RECRUITER, RoleEnum.TPO_ADMIN])


@router.post("/{job_id}/rounds")
def configure_job_rounds(
    job_id: int,
    payload: Any = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_or_admin)
):
    """
    POST /api/jobs/{id}/rounds
    Spec §6: Defines or reconfigures the sequence of rounds for a job posting.
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if current_user.role == RoleEnum.RECRUITER:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company or job.company_id != company.id:
            raise HTTPException(status_code=403, detail="Unauthorized to configure rounds for this job")

    # Normalize payload
    raw_rounds = []
    if isinstance(payload, list):
        raw_rounds = payload
    elif isinstance(payload, dict):
        if "rounds" in payload and isinstance(payload["rounds"], list):
            raw_rounds = payload["rounds"]
        else:
            raw_rounds = [payload]
    else:
        raise HTTPException(status_code=400, detail="Invalid payload format for rounds")

    if not raw_rounds:
        raise HTTPException(status_code=400, detail="At least one round must be configured")

    saved_rounds = []
    for idx, r in enumerate(raw_rounds, start=1):
        r_num = r.get("round_number") or idx
        r_name = r.get("name")
        r_type_raw = r.get("round_type")
        if not r_name or not r_type_raw:
            raise HTTPException(status_code=400, detail=f"Round {idx} missing name or round_type")

        try:
            r_type = RoundType(r_type_raw)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid round_type '{r_type_raw}'. Supported: {[t.value for t in RoundType]}")

        # Check existing round with same number
        existing = db.query(JobRound).filter(
            JobRound.job_id == job_id,
            JobRound.round_number == r_num
        ).first()

        start_t = r.get("start_time")
        end_t = r.get("end_time")
        if isinstance(start_t, str) and start_t:
            start_t = datetime.fromisoformat(start_t.replace("Z", "+00:00"))
        if isinstance(end_t, str) and end_t:
            end_t = datetime.fromisoformat(end_t.replace("Z", "+00:00"))

        if existing:
            existing.name = r_name
            existing.round_type = r_type
            if "description" in r:
                existing.description = r.get("description")
            if "test_url" in r:
                existing.test_url = r.get("test_url")
            if "meeting_url" in r:
                existing.meeting_url = r.get("meeting_url")
            if "venue" in r:
                existing.venue = r.get("venue")
            if "access_code" in r:
                existing.access_code = r.get("access_code")
            if start_t is not None:
                existing.start_time = start_t
            if end_t is not None:
                existing.end_time = end_t
            saved_rounds.append(existing)
        else:
            new_r = JobRound(
                job_id=job_id,
                round_number=r_num,
                name=r_name,
                round_type=r_type,
                description=r.get("description"),
                test_url=r.get("test_url"),
                meeting_url=r.get("meeting_url"),
                venue=r.get("venue"),
                access_code=r.get("access_code"),
                start_time=start_t,
                end_time=end_t
            )
            db.add(new_r)
            saved_rounds.append(new_r)

    db.commit()
    for sr in saved_rounds:
        db.refresh(sr)

    # Automatically point all unassigned active candidates to Round 1
    round_1 = db.query(JobRound).filter(
        JobRound.job_id == job_id,
        JobRound.round_number == 1
    ).first()
    if round_1:
        db.query(Application).filter(
            Application.job_id == job_id,
            Application.current_round_id == None,
            Application.status.in_([AppStatus.APPLIED, AppStatus.IN_PROGRESS])
        ).update(
            {"current_round_id": round_1.id, "status": AppStatus.IN_PROGRESS},
            synchronize_session=False
        )
        db.commit()

    return [
        {
            "id": r.id,
            "job_id": r.job_id,
            "round_number": r.round_number,
            "name": r.name,
            "round_type": r.round_type.value,
            "description": r.description,
            "test_url": r.test_url,
            "meeting_url": r.meeting_url,
            "venue": r.venue,
            "access_code": r.access_code,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
        }
        for r in saved_rounds
    ]


@router.get("/{job_id}/rounds")
def list_job_rounds(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/jobs/{id}/rounds
    Spec §6: Lists all configured rounds and their types for a drive with active candidate counts.
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    rounds = db.query(JobRound).filter(
        JobRound.job_id == job_id
    ).order_by(JobRound.round_number.asc()).all()

    result = []
    for r in rounds:
        count = db.query(Application).filter(
            Application.job_id == job_id,
            Application.current_round_id == r.id,
            Application.status.in_([AppStatus.IN_PROGRESS, AppStatus.APPLIED, AppStatus.SHORTLISTED, AppStatus.INTERVIEW])
        ).count()
        if r.round_number == 1:
            count += db.query(Application).filter(
                Application.job_id == job_id,
                Application.current_round_id == None,
                Application.status.in_([AppStatus.IN_PROGRESS, AppStatus.APPLIED])
            ).count()

        result.append({
            "id": r.id,
            "job_id": r.job_id,
            "round_number": r.round_number,
            "name": r.name,
            "round_type": r.round_type.value,
            "description": r.description,
            "test_url": r.test_url,
            "meeting_url": r.meeting_url,
            "venue": r.venue,
            "access_code": r.access_code,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "candidate_count": count
        })

    return result


@router.patch("/{job_id}/rounds/{round_id}/logistics")
def update_round_logistics(
    job_id: int,
    round_id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_or_admin)
):
    """
    PATCH /api/jobs/{id}/rounds/{round_id}/logistics
    Spec §6: Updates test links, meeting links, venue, time windows, and optional candidate slot assignments.
    Allowed Roles: RECRUITER, COORDINATOR, TPO
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if current_user.role == RoleEnum.RECRUITER:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company or job.company_id != company.id:
            raise HTTPException(status_code=403, detail="Unauthorized to modify logistics for this job")

    round_obj = db.query(JobRound).filter(
        JobRound.id == round_id,
        JobRound.job_id == job_id
    ).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found for this job")

    if "name" in payload and payload["name"]:
        round_obj.name = payload["name"]
    if "round_type" in payload and payload["round_type"]:
        round_obj.round_type = RoundType(payload["round_type"])
    if "description" in payload:
        round_obj.description = payload["description"]
    if "test_url" in payload:
        round_obj.test_url = payload["test_url"]
    if "meeting_url" in payload:
        round_obj.meeting_url = payload["meeting_url"]
    if "venue" in payload:
        round_obj.venue = payload["venue"]
    if "access_code" in payload:
        round_obj.access_code = payload["access_code"]

    if "start_time" in payload:
        st = payload["start_time"]
        if isinstance(st, str) and st:
            round_obj.start_time = datetime.fromisoformat(st.replace("Z", "+00:00"))
        elif st is None:
            round_obj.start_time = None

    if "end_time" in payload:
        et = payload["end_time"]
        if isinstance(et, str) and et:
            round_obj.end_time = datetime.fromisoformat(et.replace("Z", "+00:00"))
        elif et is None:
            round_obj.end_time = None

    # Handle candidate individual slot assignments if passed
    candidate_slots = payload.get("candidate_slots")
    if candidate_slots and isinstance(candidate_slots, list):
        for slot in candidate_slots:
            app_id = slot.get("application_id")
            slot_time_raw = slot.get("scheduled_slot")
            if app_id and slot_time_raw:
                slot_time = datetime.fromisoformat(slot_time_raw.replace("Z", "+00:00")) if isinstance(slot_time_raw, str) else slot_time_raw
                app = db.query(Application).filter(Application.id == app_id, Application.job_id == job_id).first()
                if app:
                    app.scheduled_slot = slot_time
                    if app.student and app.student.user_id:
                        create_system_notification(
                            db=db,
                            user_id=app.student.user_id,
                            title=f"📅 Interview Scheduled: {job.title}",
                            message=f"Your slot for Round {round_obj.round_number} ({round_obj.name}) has been scheduled for {slot_time}.",
                            category=NotificationCategory.INTERVIEW_REMINDER,
                            action_url="/student"
                        )

    db.commit()
    db.refresh(round_obj)

    return {
        "message": "Round logistics updated successfully",
        "round": {
            "id": round_obj.id,
            "job_id": round_obj.job_id,
            "round_number": round_obj.round_number,
            "name": round_obj.name,
            "round_type": round_obj.round_type.value,
            "description": round_obj.description,
            "test_url": round_obj.test_url,
            "meeting_url": round_obj.meeting_url,
            "venue": round_obj.venue,
            "access_code": round_obj.access_code,
            "start_time": round_obj.start_time.isoformat() if round_obj.start_time else None,
            "end_time": round_obj.end_time.isoformat() if round_obj.end_time else None,
        }
    }


@router.post("/{job_id}/rounds/{round_id}/shortlist")
def publish_round_shortlist(
    job_id: int,
    round_id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_only)
):
    """
    POST /api/jobs/{id}/rounds/{round_id}/shortlist
    Spec §4 & §6: Publishes shortlisted candidate IDs.
    Advances them to the next round, marks all unselected candidates as REJECTED with clear reasons,
    and optionally sets the next round's logistics.
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if current_user.role == RoleEnum.RECRUITER:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company or job.company_id != company.id:
            raise HTTPException(status_code=403, detail="Unauthorized to shortlist for this job")

    current_round = db.query(JobRound).filter(
        JobRound.id == round_id,
        JobRound.job_id == job_id
    ).first()
    if not current_round:
        raise HTTPException(status_code=404, detail="Current round not found for this job")

    # Next round in pipeline
    next_round = db.query(JobRound).filter(
        JobRound.job_id == job_id,
        JobRound.round_number == current_round.round_number + 1
    ).first()

    # Optional next round logistics update
    next_logistics = payload.get("next_round_logistics")
    if next_logistics and next_round:
        if "test_url" in next_logistics:
            next_round.test_url = next_logistics["test_url"]
        if "meeting_url" in next_logistics:
            next_round.meeting_url = next_logistics["meeting_url"]
        if "venue" in next_logistics:
            next_round.venue = next_logistics["venue"]
        if "access_code" in next_logistics:
            next_round.access_code = next_logistics["access_code"]
        if "description" in next_logistics:
            next_round.description = next_logistics["description"]
        if "start_time" in next_logistics and next_logistics["start_time"]:
            st = next_logistics["start_time"]
            next_round.start_time = datetime.fromisoformat(st.replace("Z", "+00:00")) if isinstance(st, str) else st
        if "end_time" in next_logistics and next_logistics["end_time"]:
            et = next_logistics["end_time"]
            next_round.end_time = datetime.fromisoformat(et.replace("Z", "+00:00")) if isinstance(et, str) else et

    # Parse candidate slot assignments if given
    slot_assignments = payload.get("candidate_slots") or []
    slots_map = {}
    for item in slot_assignments:
        aid = item.get("application_id")
        slot_t = item.get("scheduled_slot")
        if aid and slot_t:
            slots_map[aid] = datetime.fromisoformat(slot_t.replace("Z", "+00:00")) if isinstance(slot_t, str) else slot_t

    # Shortlisted IDs (supports application IDs)
    raw_shortlist = payload.get("shortlisted_application_ids") or payload.get("shortlisted_candidate_ids") or []
    shortlist_ids = set(raw_shortlist)

    # Find all candidates currently active in this round (or applied if round 1)
    all_job_apps = db.query(Application).filter(
        Application.job_id == job_id,
        Application.status != AppStatus.REJECTED
    ).all()

    candidates_in_round = [
        app for app in all_job_apps
        if app.current_round_id == current_round.id or (
            current_round.round_number == 1 and (app.current_round_id is None or app.current_round_id == current_round.id)
        )
    ]

    shortlisted_count = 0
    rejected_count = 0

    for app in candidates_in_round:
        student_user_id = app.student.user_id if app.student else None
        if app.id in shortlist_ids:
            shortlisted_count += 1
            if next_round:
                # Advance to Next Round (Spec §4)
                app.status = AppStatus.IN_PROGRESS
                app.current_round_id = next_round.id
                if app.id in slots_map:
                    app.scheduled_slot = slots_map[app.id]
                if student_user_id:
                    create_system_notification(
                        db=db,
                        user_id=student_user_id,
                        title=f"🎉 Shortlisted for {job.title}",
                        message=f"Congratulations! You advanced to Round {next_round.round_number}: {next_round.name} for {job.title}.",
                        category=NotificationCategory.SHORTLIST,
                        action_url="/student"
                    )
            else:
                # Final round cleared → Offer Extended!
                app.status = AppStatus.OFFERED
                student = db.query(StudentProfile).filter(StudentProfile.id == app.student_id).first()
                if student:
                    student.is_placed = 1
                if student_user_id:
                    create_system_notification(
                        db=db,
                        user_id=student_user_id,
                        title=f"🌟 Job Offer Received: {job.title}",
                        message=f"Congratulations! You have received a job offer for {job.title} at {job.company_name}!",
                        category=NotificationCategory.OFFER,
                        action_url="/student"
                    )
        else:
            # Immediate Transparent Rejection (Spec §4)
            rejected_count += 1
            app.status = AppStatus.REJECTED
            app.rejection_round_number = current_round.round_number
            app.rejection_reason = f"Not shortlisted for Round {current_round.round_number} - {current_round.name}"
            if student_user_id:
                create_system_notification(
                    db=db,
                    user_id=student_user_id,
                    title=f"Application Update: {job.title}",
                    message=f"Your application status for {job.title} was updated: Not shortlisted for Round {current_round.round_number}.",
                    category=NotificationCategory.APPLICATION_STATUS,
                    action_url="/student"
                )

    db.commit()

    return {
        "message": f"Shortlist published successfully. {shortlisted_count} candidate(s) advanced, {rejected_count} candidate(s) rejected.",
        "job_id": job_id,
        "round_id": current_round.id,
        "round_number": current_round.round_number,
        "round_name": current_round.name,
        "shortlisted_count": shortlisted_count,
        "rejected_count": rejected_count,
        "next_round_id": next_round.id if next_round else None,
        "next_round_number": next_round.round_number if next_round else None,
        "is_final_round": next_round is None
    }

