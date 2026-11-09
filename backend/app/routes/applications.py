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


from datetime import datetime, timezone, timedelta

def serialize_application_tracker(app: Application, job: JobPosting, company: Optional[Company], db: Session):
    """
    Serializes application with rich dynamic round pipeline info,
    scheduled slot, test/meeting link delivery, buffer entry window gating,
    and countdown unlock/expiry logic.
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

    # Compute buffer window / launch action / countdown for active round
    launch_info = None
    if curr_round and app.status not in [AppStatus.REJECTED, AppStatus.OFFERED]:
        now = datetime.now(timezone.utc)
        
        start_time_aware = None
        if curr_round.start_time:
            start_time_aware = curr_round.start_time.replace(tzinfo=timezone.utc) if curr_round.start_time.tzinfo is None else curr_round.start_time

        end_time_aware = None
        if curr_round.end_time:
            end_time_aware = curr_round.end_time.replace(tzinfo=timezone.utc) if curr_round.end_time.tzinfo is None else curr_round.end_time

        slot_aware = None
        if app.scheduled_slot:
            slot_aware = app.scheduled_slot.replace(tzinfo=timezone.utc) if app.scheduled_slot.tzinfo is None else app.scheduled_slot

        # If individual candidate has a slot (e.g. for virtual interview):
        # Buffer window: Join between 10 mins before slot and 20 mins after slot
        if slot_aware:
            window_start = slot_aware - timedelta(minutes=10)
            window_end = slot_aware + timedelta(minutes=20)
        else:
            window_start = start_time_aware
            window_end = end_time_aware

        has_started = app.round_started_at is not None
        window_state = "NO_RESTRICTION"
        countdown_seconds = 0
        window_remaining_seconds = 0
        is_unlocked = True
        status_badge = "Available"
        status_message = "You can enter or launch this round."

        if window_start and window_end:
            if has_started:
                window_state = "STARTED"
                is_unlocked = True
                status_badge = "Attempt in Progress"
                status_message = f"Started at {app.round_started_at.strftime('%I:%M %p')}."
            elif now < window_start:
                window_state = "UPCOMING"
                is_unlocked = False
                diff = (window_start - now).total_seconds()
                countdown_seconds = max(0, int(diff))
                status_badge = "Window Opens Soon"
                status_message = f"Entry window: {window_start.strftime('%I:%M %p')} to {window_end.strftime('%I:%M %p')}. Must start during this window."
            elif window_start <= now <= window_end:
                window_state = "ACTIVE_BUFFER"
                is_unlocked = True
                rem = (window_end - now).total_seconds()
                window_remaining_seconds = max(0, int(rem))
                status_badge = "Entry Window Open"
                rem_mins = int(rem // 60)
                rem_secs = int(rem % 60)
                status_message = f"Buffer Active: Must start before {window_end.strftime('%I:%M %p')} ({rem_mins}m {rem_secs}s left to begin)."
            else:
                window_state = "EXPIRED"
                is_unlocked = False
                status_badge = "Missed Round (Disqualified)"
                status_message = f"You missed Round {curr_round.round_number} ({curr_round.name}). The entry buffer closed at {window_end.strftime('%I:%M %p')}. You did not attend in the given time and cannot proceed further."
                if app.status not in [AppStatus.REJECTED, AppStatus.OFFERED]:
                    app.status = AppStatus.REJECTED
                    app.rejection_round_number = curr_round.round_number
                    app.rejection_reason = f"You missed {curr_round.name} (Round {curr_round.round_number}). The entry buffer window closed at {window_end.strftime('%I:%M %p')}. Since you did not attend in the given time, you cannot proceed further."
                    db.commit()
        elif window_start and not window_end:
            if now < window_start:
                window_state = "UPCOMING"
                is_unlocked = False
                diff = (window_start - now).total_seconds()
                countdown_seconds = max(0, int(diff))
                status_badge = "Starts Soon"
                status_message = f"Round starts at {window_start.strftime('%I:%M %p')}."
            else:
                window_state = "ACTIVE_BUFFER"
                is_unlocked = True
                status_badge = "Active"
                status_message = "Round is currently in progress."
        elif not window_start and window_end:
            if now > window_end and not has_started:
                window_state = "EXPIRED"
                is_unlocked = False
                status_badge = "Missed Round (Disqualified)"
                status_message = f"You missed Round {curr_round.round_number} ({curr_round.name}). The entry deadline was {window_end.strftime('%I:%M %p')}. You did not attend in the given time and cannot proceed further."
                if app.status not in [AppStatus.REJECTED, AppStatus.OFFERED]:
                    app.status = AppStatus.REJECTED
                    app.rejection_round_number = curr_round.round_number
                    app.rejection_reason = f"You missed {curr_round.name} (Round {curr_round.round_number}). The entry deadline was {window_end.strftime('%I:%M %p')}. Since you did not attend in the given time, you cannot proceed further."
                    db.commit()
            else:
                window_state = "ACTIVE_BUFFER"
                is_unlocked = True
                rem = (window_end - now).total_seconds()
                window_remaining_seconds = max(0, int(rem))
                status_badge = "Open"
                status_message = f"Must start before {window_end.strftime('%I:%M %p')}."

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
            "round_started_at": app.round_started_at.isoformat() if app.round_started_at else None,
            "window_start": window_start.isoformat() if window_start else None,
            "window_end": window_end.isoformat() if window_end else None,
            "window_state": window_state,
            "status_badge": status_badge,
            "status_message": status_message,
            "launch_url": launch_url,
            "button_label": button_label,
            "countdown_seconds": countdown_seconds,
            "window_remaining_seconds": window_remaining_seconds,
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
        "applied_at": (app.applied_at.isoformat() + "Z") if app.applied_at else None,
        "ai_match_score": app.ai_match_score,
        "current_round_id": app.current_round_id,
        "scheduled_slot": (app.scheduled_slot.isoformat() + "Z") if app.scheduled_slot else None,
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


@router.post("/{application_id}/launch")
def launch_application_round(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(student_required)
):
    """
    Called when student launches test/interview.
    Validates entry buffer window (e.g. 1 PM to 2 PM).
    Records round_started_at timestamp so attempt is recognized.
    """
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    app = db.query(Application).filter(
        Application.id == application_id,
        Application.student_id == profile.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
        
    if app.status == AppStatus.REJECTED:
        raise HTTPException(
            status_code=400,
            detail=app.rejection_reason or "You have been disqualified from this recruitment drive and cannot proceed further."
        )
    if app.status == AppStatus.OFFERED:
        raise HTTPException(status_code=400, detail="Official offer already extended for this drive.")
        
    curr_round = db.query(JobRound).filter(JobRound.id == app.current_round_id).first()
    if not curr_round:
        curr_round = db.query(JobRound).filter(JobRound.job_id == app.job_id, JobRound.round_number == 1).first()
        if not curr_round:
            raise HTTPException(status_code=400, detail="No active round configured for this drive.")

    now = datetime.now(timezone.utc)
    
    start_time_aware = None
    if curr_round.start_time:
        start_time_aware = curr_round.start_time.replace(tzinfo=timezone.utc) if curr_round.start_time.tzinfo is None else curr_round.start_time

    end_time_aware = None
    if curr_round.end_time:
        end_time_aware = curr_round.end_time.replace(tzinfo=timezone.utc) if curr_round.end_time.tzinfo is None else curr_round.end_time

    slot_aware = None
    if app.scheduled_slot:
        slot_aware = app.scheduled_slot.replace(tzinfo=timezone.utc) if app.scheduled_slot.tzinfo is None else app.scheduled_slot

    if slot_aware:
        window_start = slot_aware - timedelta(minutes=10)
        window_end = slot_aware + timedelta(minutes=20)
    else:
        window_start = start_time_aware
        window_end = end_time_aware

    # If already started, allow re-launching URL anytime
    if app.round_started_at:
        launch_url = curr_round.test_url or curr_round.meeting_url
        return {
            "message": "Continuing active attempt",
            "launch_url": launch_url,
            "round_started_at": app.round_started_at.isoformat()
        }

    # Verify start window
    if window_start and now < window_start:
        raise HTTPException(
            status_code=400,
            detail=f"Entry window opens at {window_start.strftime('%I:%M %p')}. You cannot start before the window opens."
        )

    if window_end and now > window_end:
        if app.status not in [AppStatus.REJECTED, AppStatus.OFFERED]:
            app.status = AppStatus.REJECTED
            app.rejection_round_number = curr_round.round_number
            app.rejection_reason = f"You missed {curr_round.name} (Round {curr_round.round_number}). The entry buffer closed at {window_end.strftime('%I:%M %p')}. Since you did not attend in the given time, you cannot proceed further."
            db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"You missed Round {curr_round.round_number} ({curr_round.name}). The entry buffer closed at {window_end.strftime('%I:%M %p')}. You did not attend in the given time and cannot proceed further."
        )

    app.round_started_at = now
    db.commit()

    launch_url = curr_round.test_url or curr_round.meeting_url
    return {
        "message": "Round launched successfully within entry buffer window",
        "launch_url": launch_url,
        "round_started_at": app.round_started_at.isoformat()
    }
