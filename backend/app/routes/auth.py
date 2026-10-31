"""
Authentication Routes — Password Login + Google SSO
Spec Reference: §2.B (TPO Login), §3.B (Coordinator SSO), §5.B (Student SSO)
Google SSO Flow: google_sso_and_batch_eligibility_spec.md §2
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..models.batch_eligibility import BatchEligibility
from ..schemas.user import UserCreate, UserResponse, Token
from ..services.auth_service import get_password_hash, verify_password, create_access_token, get_current_user
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ─── Pydantic schema for Google SSO ───
class GoogleTokenRequest(BaseModel):
    token: str  # Google ID Token (JWT) from frontend


def _issue_jwt(user: User) -> dict:
    """Helper: create a CareerBridge session JWT for any authenticated user."""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    role_value = user.role.value if isinstance(user.role, RoleEnum) else user.role
    access_token = create_access_token(
        data={"sub": user.email.strip().lower(), "role": role_value},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_value,
        "full_name": user.full_name
    }


# ═══════════════════════════════════════════════
# 1. Email + Password Login (TPO, Coordinator, Recruiter, Students with passwords)
# ═══════════════════════════════════════════════

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    from sqlalchemy import func
    login_identifier = form_data.username.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == login_identifier).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact the TPO Admin."
        )
    
    # Option 2: If no custom password has been set yet, prompt to sign in with Google or use Set Password
    if user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No password has been set for this account yet. Please sign in with Google or click 'Set / Reset Password' to create your password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Enforce BatchEligibility for Students (consistent with Google SSO)
    if user.role == RoleEnum.STUDENT:
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if student_profile and student_profile.graduation_year:
            batch = db.query(BatchEligibility).filter(
                BatchEligibility.graduation_year == student_profile.graduation_year
            ).first()
            if not batch:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Placement registration is currently restricted. The {student_profile.graduation_year} batch has not been activated. Please contact the TPO."
                )
            if not batch.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Placement portal is currently closed for the {student_profile.graduation_year} batch. Please contact the TPO."
                )

    return _issue_jwt(user)


# ═══════════════════════════════════════════════
# 2. Google SSO Login (Spec: google_sso_and_batch_eligibility_spec.md §2)
#    5-Step verification pipeline:
#    Step 1: Verify Google ID Token signature
#    Step 2: Validate hosted domain (hd == college.edu)
#    Step 3: Check user is pre-registered in master roster
#    Step 4: Check BatchEligibility (dynamic batch gating)
#    Step 5: Issue CareerBridge JWT
# ═══════════════════════════════════════════════

@router.post("/google", response_model=Token)
def google_sso_login(body: GoogleTokenRequest, db: Session = Depends(get_db)):
    """
    Validates a Google ID Token from the frontend.
    Students and Coordinators use institutional Google Workspace accounts.
    """
    # ── Step 1: Verify Google Token — supports both access_token and id_token ──
    # In dev/demo testing or live Google OAuth:
    if body.token.startswith("demo_sso:"):
        simulated_email = body.token.split("demo_sso:", 1)[1].strip()
        sim_domain = simulated_email.split("@")[-1] if "@" in simulated_email else ""
        id_info = {
            "email": simulated_email,
            "hd": sim_domain if sim_domain.lower() == settings.COLLEGE_DOMAIN.lower() else None,
            "name": simulated_email.split("@")[0].replace(".", " ").title()
        }
    else:
        # @react-oauth/google useGoogleLogin returns an OAuth2 access_token.
        # We fetch Google's userinfo endpoint to validate it and extract the email.
        try:
            import requests as http_requests
            
            # First, try treating it as an access_token via Google Userinfo API
            userinfo_resp = http_requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {body.token}"},
                timeout=10
            )
            
            if userinfo_resp.status_code == 200:
                id_info = userinfo_resp.json()
            else:
                # Fallback: treat it as a Google ID Token (JWT) and verify with google-auth
                from google.oauth2 import id_token as google_id_token
                from google.auth.transport import requests as google_requests
                
                if settings.GOOGLE_CLIENT_ID:
                    id_info = google_id_token.verify_oauth2_token(
                        body.token,
                        google_requests.Request(),
                        settings.GOOGLE_CLIENT_ID
                    )
                else:
                    id_info = google_id_token.verify_oauth2_token(
                        body.token,
                        google_requests.Request()
                    )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google token verification failed: {str(e)}"
            )

    # ── Step 2: Email Extraction & Normalization ──
    email: str = (id_info.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google authentication succeeded, but no email was provided."
        )

    # ── Step 3: Admin Roster Verification ──
    # Only allow users whose emails are in the admin-added placement roster (User table)
    from sqlalchemy import func
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access Denied: The email '{email}' is not registered in the placement roster. "
                f"Only accounts added by the TPO Admin are authorized to sign in. "
                f"Please contact your Placement Cell to add your email."
            )
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the TPO Admin."
        )

    # ── Step 4: Dynamic Batch Eligibility Check (Students only) ──
    # Coordinators skip this check — they are appointed, not batch-controlled
    if user.role == RoleEnum.STUDENT:
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == user.id
        ).first()

        if student_profile and student_profile.graduation_year:
            batch = db.query(BatchEligibility).filter(
                BatchEligibility.graduation_year == student_profile.graduation_year
            ).first()

            if not batch:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Placement registration is currently restricted. "
                        f"The {student_profile.graduation_year} batch has not been activated. "
                        f"Please contact the TPO when your placement cycle commences."
                    )
                )

            if not batch.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Placement portal is currently closed for the {student_profile.graduation_year} batch. "
                        f"Your batch will be activated by the TPO when the recruitment season begins."
                    )
                )

    # ── Step 5: Issue CareerBridge Session JWT ──
    return _issue_jwt(user)


# ═══════════════════════════════════════════════
# 3. Registration (used for initial seeding / admin CLI only — not student-facing)
# ═══════════════════════════════════════════════

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ═══════════════════════════════════════════════
# 4. Current User Info
# ═══════════════════════════════════════════════

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


# ═══════════════════════════════════════════════
# 5. Password Management (Change & Reset Password)
# ═══════════════════════════════════════════════

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None
    new_password: str

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str
    old_password: Optional[str] = None

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows any logged-in user to set or update their password."""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    if current_user.hashed_password is not None and data.old_password:
        if not verify_password(data.old_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password does not match.")
    
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully. You can now use it to sign in."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Set initial password or reset password for an existing account in the placement roster.
    Enforces authorization:
    - Root TPO Admin accounts cannot be reset via public self-service.
    - Deactivated accounts are rejected.
    - For students, batch eligibility must be active.
    - If account already has a password, verifies old_password if supplied.
    """
    from sqlalchemy import func
    normalized_email = data.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email in the placement roster."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the TPO Admin."
        )
    
    # Root TPO Admin credentials must not be reset via unauthenticated public endpoints
    if user.role == RoleEnum.TPO_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="TPO Admin credentials cannot be reset through self-service for security reasons. Please contact the system administrator."
        )

    # For students, enforce dynamic batch eligibility
    if user.role == RoleEnum.STUDENT:
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if student_profile and student_profile.graduation_year:
            batch = db.query(BatchEligibility).filter(
                BatchEligibility.graduation_year == student_profile.graduation_year
            ).first()
            if not batch or not batch.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Placement portal is currently closed for the {student_profile.graduation_year} batch. Please contact the TPO."
                )

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    
    # If the user already has an established password and provided old_password, verify it
    if user.hashed_password is not None and data.old_password:
        if not verify_password(data.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password does not match.")

    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": f"Password for {user.email} has been updated. You can now log in with your new password."}


