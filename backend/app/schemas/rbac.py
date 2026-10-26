from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ─── TPO Admin Schemas ───

class CoordinatorCreate(BaseModel):
    email: EmailStr
    full_name: str
    department: str  # e.g., "CSE", "ECE", "MECH"

class CoordinatorResponse(BaseModel):
    id: int
    email: str
    full_name: str
    department: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BatchEligibilityToggle(BaseModel):
    graduation_year: int
    label: Optional[str] = None
    is_active: Optional[bool] = None
    is_login_allowed: Optional[bool] = None
    allow_internships: Optional[bool] = False
    allow_full_time: Optional[bool] = True

class BatchEligibilityResponse(BaseModel):
    id: int
    graduation_year: int
    label: Optional[str] = None
    is_active: bool
    is_login_allowed: bool = False
    allow_internships: bool = False
    allow_full_time: bool = True

    class Config:
        from_attributes = True

class InviteRecruiterRequest(BaseModel):
    email: EmailStr
    company_name: str

class InviteRecruiterResponse(BaseModel):
    message: str
    invitation_id: int
    email: str

# ─── Recruiter Schemas ───

class RecruiterActivation(BaseModel):
    token: str
    password: str
    full_name: Optional[str] = None

class CompanyProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None

class JobPostingCreate(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    job_type: str = "Full-Time"  # Full-Time / Internship
    ctc_lpa: Optional[float] = None
    stipend_monthly: Optional[float] = None
    eligibility_cgpa: float = 0.0
    eligible_departments: List[str] = []
    max_backlogs: int = 0
    drive_date: Optional[datetime] = None
    deadline: Optional[datetime] = None

class JobPostingResponse(BaseModel):
    id: int
    title: str
    description: str
    location: Optional[str] = None
    job_type: Optional[str] = None
    ctc_lpa: Optional[float] = None
    stipend_monthly: Optional[float] = None
    eligibility_cgpa: float
    eligible_departments: Optional[List[str]] = None
    max_backlogs: int
    drive_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    is_approved: bool
    is_active: bool
    company_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationStatusUpdate(BaseModel):
    status: str  # APPLIED, SHORTLISTED, INTERVIEW, OFFERED, REJECTED

# ─── Student Schemas ───

class StudentProfileResponse(BaseModel):
    id: int
    roll_number: Optional[str] = None
    department: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    active_backlogs: int = 0
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    contact_number: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    resume_url: Optional[str] = None
    skills_list: Optional[List] = None   # AI-parsed + manually added skill tags
    skills: Optional[List] = None
    is_placed: Optional[int] = 0

    class Config:
        from_attributes = True

class StudentProfileUpdate(BaseModel):
    """Only enrichment fields — student cannot edit locked academic data (spec §3.B)."""
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    contact_number: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    skills_list: Optional[List[str]] = None  # Manual skill tag additions
    skills: Optional[List[str]] = None

class StudentListResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    roll_number: Optional[str] = None
    department: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    active_backlogs: int = 0
    is_placed: Optional[int] = 0
    resume_url: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    job_title: str
    company_name: str
    status: str
    ai_match_score: Optional[float] = None
    applied_at: datetime

class JobWithEligibility(BaseModel):
    id: int
    title: str
    description: str
    company_name: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    ctc_lpa: Optional[float] = None
    stipend_monthly: Optional[float] = None
    eligibility_cgpa: float
    eligible_departments: Optional[List[str]] = None
    max_backlogs: int
    deadline: Optional[datetime] = None
    drive_date: Optional[datetime] = None
    is_eligible: bool = False
    ineligibility_reason: Optional[str] = None
    has_applied: Optional[bool] = False

# ─── Analytics Schemas ───

class PlacementAnalytics(BaseModel):
    total_students: int
    placed_students: int
    placement_percentage: float
    total_offers: int
    average_ctc: Optional[float] = None
    highest_ctc: Optional[float] = None
    department_wise: Optional[dict] = None
