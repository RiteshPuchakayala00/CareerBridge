"""
Applications & Student Pipeline Tracking Routes
Spec Reference: interview_rounds_and_shortlisting_spec.md §6
Endpoint: /api/applications/my-applications
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..models.job import JobPosting
from ..models.company import Company
from ..models.job_round import JobRound
from ..models.application import Application, AppStatus
from ..services.auth_service import require_role
from ..services.one_offer_service import enforce_one_offer_policy

router = APIRouter(prefix="/api/applications", tags=["Applications & Shortlisting"])

student_required = require_role([RoleEnum.STUDENT])


def serialize_application_tracker(app: Application, job: JobPosting, company: Optional[Company], db: Session):
    """
    Serializes application with rich dynamic round pipeline info,
    scheduled slot, test/meeting link delivery, and countdown unlock logic.
    """
    # Fetch all rounds configured for this drive
    all_rounds = db.query(JobRound).filter(
        JobRound.job_id == job.id
    ).order_by(JobRound.round_number.asc()).all()

    # Determine candidate's current active round
    curr_round = None
    if app.current_round_id:
        curr_round = db.query(JobRound).filter(JobRound.id == app.current_round_id).first()
    elif all_rounds and app.status not in [AppStatus.REJECTED, AppStatus.OFFERED]:
        # If candidate has not been assigned a specific round yet, default to Round 1
        curr_round = all_rounds[0]

    # Compute launch action / countdown for active round
    launch_info = None
    if curr_round and app.status not in [AppStatus.REJECTED, AppStatus.OFFERED]:
        now = datetime.now(timezone.utc)
        start_time_aware = None
        if curr_round.start_time:
            start_time_aware = curr_round.start_time.replace(tzinfo=timezone.utc) if curr_round.start_time.tzinfo is None else curr_round.start_time

        slot_aware = None
        if app.scheduled_slot:
            slot_aware = app.scheduled_slot.replace(tzinfo=timezone.utc) if app.scheduled_slot.tzinfo is None else app.scheduled_slot

        # Reference time is candidate's slot or round start time
        ref_time = slot_aware or start_time_aware
        countdown_seconds = 0
        is_unlocked = True

        if ref_time:
            diff = (ref_time - now).total_seconds()
            countdown_seconds = max(0, int(diff))
            # Virtual interviews unlock 10 minutes (600s) before slot
            if curr_round.round_type.value == "VIRTUAL_INTERVIEW":
                is_unlocked = diff <= 600
            elif curr_round.round_type.value == "ONLINE_TEST":
                is_unlocked = diff <= 0 or (curr_round.end_time and now <= curr_round.end_time.replace(tzinfo=timezone.utc) if curr_round.end_time.tzinfo is None else True)

        launch_url = curr_round.test_url or curr_round.meeting_url
        button_label = "Launch Test" if curr_round.round_type.value == "ONLINE_TEST" else (
            "Join Google Meet / Interview" if curr_round.round_type.value == "VIRTUAL_INTERVIEW" else "View Venue Details"
        )

        launch_info = {
            "round_id": curr_round.id,
            "round_number": curr_round.round_number,
            "name": curr_round.name,
            "round_type": curr_round.round_type.value,
            "description": curr_round.description,
            "test_url": curr_round.test_url,
            "meeting_url": curr_round.meeting_url,
            "venue": curr_round.venue,
            "access_code": curr_round.access_code,
            "start_time": curr_round.start_time.isoformat() if curr_round.start_time else None,
            "end_time": curr_round.end_time.isoformat() if curr_round.end_time else None,
            "scheduled_slot": app.scheduled_slot.isoformat() if app.scheduled_slot else None,
            "launch_url": launch_url,
            "button_label": button_label,
            "countdown_seconds": countdown_seconds,
            "is_unlocked": is_unlocked
        }

    return {
        "id": app.id,
        "job_id": job.id,
        "job_title": job.title,
        "company_name": company.company_name if company else "N/A",
        "company_logo": company.logo_url if company else None,
        "location": job.location,
        "job_type": job.job_type,
        "ctc_lpa": job.ctc_lpa,
        "stipend_monthly": job.stipend_monthly,
        "status": app.status.value if app.status else "APPLIED",
        "applied_at": app.applied_at.isoformat() if app.applied_at else None,
        "ai_match_score": app.ai_match_score,
        "current_round_id": app.current_round_id,
        "scheduled_slot": app.scheduled_slot.isoformat() if app.scheduled_slot else None,
        "rejection_round_number": app.rejection_round_number,
        "rejection_reason": app.rejection_reason,
        "all_rounds": [
            {
                "id": r.id,
                "round_number": r.round_number,
                "name": r.name,
                "round_type": r.round_type.value,
                "description": r.description
            }
            for r in all_rounds
        ],
        "current_round": launch_info
    }


@router.get("/my-applications")
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(student_required)
):
    """
    Spec Reference §6:
    GET /api/applications/my-applications
    Returns student applications with current round tracker, scheduled slots,
    and active test/meeting launch buttons.
    """
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return []

    # Enforce One-Offer Policy cleanup if placed
    if profile.is_placed == 1:
        offered_item = db.query(Application, Company).join(
            JobPosting, Application.job_id == JobPosting.id
        ).outerjoin(
            Company, JobPosting.company_id == Company.id
        ).filter(
            Application.student_id == profile.id,
            Application.status == AppStatus.OFFERED
        ).first()
        if offered_item:
            off_app, off_comp = offered_item
            cname = off_comp.company_name if off_comp else "an enterprise"
            enforce_one_offer_policy(db, profile.id, cname, off_app.id)

    apps = db.query(Application, JobPosting, Company).join(
        JobPosting, Application.job_id == JobPosting.id
    ).outerjoin(
        Company, JobPosting.company_id == Company.id
    ).filter(
        Application.student_id == profile.id
    ).order_by(Application.applied_at.desc()).all()

    return [
        serialize_application_tracker(app, job, company, db)
        for app, job, company in apps
    ]
