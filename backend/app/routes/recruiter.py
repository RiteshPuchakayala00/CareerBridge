"""
Recruiter Routes — Corporate HR & Talent Acquisition Operations
Spec Reference: Section 4 (Role 3 — RECRUITER)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..models.company import Company
from ..models.job import JobPosting, JobStatus
from ..models.application import Application, AppStatus
from ..models.job_round import JobRound
from ..models.recruiter_invitation import RecruiterInvitation
from ..schemas.rbac import (
    RecruiterActivation, CompanyProfileUpdate,
    JobPostingCreate, JobPostingResponse,
    ApplicationStatusUpdate
)
from ..services.auth_service import get_password_hash, require_role
from ..services.one_offer_service import enforce_one_offer_policy

router = APIRouter(prefix="/api/recruiter", tags=["Recruiter"])

recruiter_required = require_role([RoleEnum.RECRUITER])


# ═══════════════════════════════════════════════
# 1. Account Activation via Invite Token (Spec §4.B.3)
# ═══════════════════════════════════════════════

@router.post("/activate", status_code=status.HTTP_201_CREATED)
def activate_recruiter_account(
    data: RecruiterActivation,
    db: Session = Depends(get_db)
):
    """Recruiter activates account using the invitation token, sets password."""
    invitation = db.query(RecruiterInvitation).filter(
        RecruiterInvitation.token == data.token,
        RecruiterInvitation.is_used == False
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid or expired activation token")
    
    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Activation token has expired")
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == invitation.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Account already activated")
    
    # Create the recruiter user
    new_user = User(
        email=invitation.email,
        full_name=data.full_name or invitation.company_name + " Recruiter",
        hashed_password=get_password_hash(data.password),
        role=RoleEnum.RECRUITER,
        is_active=True,
        invited_by_id=invitation.invited_by_id
    )
    db.add(new_user)
    db.flush()
    
    # Create company profile
    company = Company(
        user_id=new_user.id,
        company_name=invitation.company_name
    )
    db.add(company)
    
    # Mark invitation as used
    invitation.is_used = True
    db.commit()
    
    return {"message": f"Account activated for {invitation.email}. You can now sign in."}


# ═══════════════════════════════════════════════
# 2. Company Profile Management (Spec §4.C.1)
# ═══════════════════════════════════════════════

@router.get("/profile")
def get_company_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_required)
):
    """View company profile."""
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return {
        "id": company.id,
        "company_name": company.company_name,
        "industry": company.industry,
        "website": company.website,
        "description": company.description,
        "logo_url": company.logo_url
    }


@router.put("/profile")
def update_company_profile(
    data: CompanyProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_required)
):
    """Update company bio, website, industry category."""
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    if data.company_name is not None:
        company.company_name = data.company_name
    if data.industry is not None:
        company.industry = data.industry
    if data.website is not None:
        company.website = data.website
    if data.description is not None:
        company.description = data.description
    
    db.commit()
    return {"message": "Company profile updated successfully"}


# ═══════════════════════════════════════════════
# 3. Job & Internship Postings (Spec §4.C.2)
# ═══════════════════════════════════════════════

@router.post("/jobs", status_code=status.HTTP_201_CREATED)
def create_job_posting(
    data: JobPostingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_required)
):
    """Create a detailed job opening with eligibility criteria."""
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Complete your company profile first")
    
    job = JobPosting(
        company_id=company.id,
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
        drive_date=data.drive_date,
        deadline=data.deadline,
        status=JobStatus.PENDING_APPROVAL,
        is_approved=False,
        is_active=True
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"message": f"Job '{data.title}' submitted for approval", "job_id": job.id, "status": "PENDING_APPROVAL"}


@router.get("/jobs")
def list_own_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_required)
):
    """List jobs posted by this recruiter's company."""
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        return []
    
    jobs = db.query(JobPosting).filter(JobPosting.company_id == company.id).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "job_type": j.job_type,
            "ctc_lpa": j.ctc_lpa,
            "is_approved": j.is_approved,
            "is_active": j.is_active,
            "status": j.status.value if j.status else "PENDING_APPROVAL",
            "deadline": j.deadline.isoformat() if j.deadline else None,
            "drive_date": j.drive_date.isoformat() if j.drive_date else None,
            "applicant_count": db.query(Application).filter(Application.job_id == j.id).count()
        }
        for j in jobs
    ]


# ═══════════════════════════════════════════════
# 4. Applicant Evaluation (Spec §4.C.3)
# ═══════════════════════════════════════════════

@router.get("/applicants/{job_id}")
def list_applicants(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_required)
):
    """Review eligible students who applied to a specific job."""
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.company_id == company.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not owned by your company")
    
    applications = db.query(Application, StudentProfile, User).join(
        StudentProfile, Application.student_id == StudentProfile.id
    ).join(
        User, StudentProfile.user_id == User.id
    ).filter(
        Application.job_id == job_id
    ).order_by(Application.ai_match_score.desc().nullslast()).all()
    
    # Pre-fetch rounds for this job
    rounds = {r.id: r for r in db.query(JobRound).filter(JobRound.job_id == job_id).all()}
    first_round = next((r for r in sorted(rounds.values(), key=lambda x: x.round_number)), None)

    results = []
    for app, sp, u in applications:
        r_obj = rounds.get(app.current_round_id)
        if not r_obj and app.status not in [AppStatus.REJECTED, AppStatus.OFFERED]:
            r_obj = first_round

        results.append({
            "application_id": app.id,
            "student_id": sp.id,
            "student_name": u.full_name,
            "email": u.email,
            "department": sp.department,
            "cgpa": sp.cgpa,
            "roll_number": sp.roll_number,
            "resume_url": sp.resume_url,
            "status": app.status.value if app.status else "APPLIED",
            "ai_match_score": app.ai_match_score,
            "ai_analysis": app.ai_analysis,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "current_round_id": r_obj.id if r_obj else None,
            "current_round_number": r_obj.round_number if r_obj else None,
            "current_round_name": r_obj.name if r_obj else None,
            "scheduled_slot": app.scheduled_slot.isoformat() if app.scheduled_slot else None,
            "rejection_round_number": app.rejection_round_number,
            "rejection_reason": app.rejection_reason
        })

    return results



# ═══════════════════════════════════════════════
# 5. Application Pipeline Management (Spec §4.C.4)
# ═══════════════════════════════════════════════

@router.put("/applicants/{application_id}/status")
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(recruiter_required)
):
    """Transition candidate: APPLIED → SHORTLISTED → INTERVIEW → OFFERED or REJECTED."""
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    application = db.query(Application).join(
        JobPosting, Application.job_id == JobPosting.id
    ).filter(
        Application.id == application_id,
        JobPosting.company_id == company.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    try:
        new_status = AppStatus(data.status.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {[s.value for s in AppStatus]}")
    
    application.status = new_status
    
    # If OFFERED, mark student as placed and enforce One-Offer Policy
    if new_status == AppStatus.OFFERED:
        student = db.query(StudentProfile).filter(StudentProfile.id == application.student_id).first()
        if student:
            student.is_placed = 1
            comp_name = company.company_name if company else "a company"
            enforce_one_offer_policy(db, student.id, comp_name, application.id)
    
    db.commit()
    return {"message": f"Application status updated to {new_status.value}"}
