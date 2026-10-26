from sqlalchemy.orm import Session
from ..models.application import Application, AppStatus
from ..models.notification import NotificationCategory
from ..routes.notifications import create_system_notification

def enforce_one_offer_policy(db: Session, student_id: int, offering_company_name: str, offered_app_id: int):
    """
    Enforces the university One-Offer Policy:
    When a student secures a placement offer, all other active applications
    (APPLIED, IN_PROGRESS, SHORTLISTED, INTERVIEW) are automatically concluded.
    Revokes round/link access and records a transparent closure reason.
    """
    other_apps = db.query(Application).filter(
        Application.student_id == student_id,
        Application.id != offered_app_id,
        Application.status.in_([
            AppStatus.APPLIED,
            AppStatus.IN_PROGRESS,
            AppStatus.SHORTLISTED,
            AppStatus.INTERVIEW
        ])
    ).all()

    for other in other_apps:
        other.status = AppStatus.REJECTED
        other.rejection_reason = (
            f"Application concluded under university One-Offer Policy: You have secured a placement offer with {offering_company_name}."
        )
        if other.student and other.student.user_id:
            job_title = other.job.title if other.job else "Recruitment Drive"
            try:
                create_system_notification(
                    db=db,
                    user_id=other.student.user_id,
                    title=f"One-Offer Policy: {job_title} Concluded",
                    message=(
                        f"In accordance with college placement policy, your application for {job_title} "
                        f"has been concluded because you secured an offer with {offering_company_name}."
                    ),
                    category=NotificationCategory.APPLICATION_STATUS,
                    action_url="/student"
                )
            except Exception:
                pass

    db.commit()
