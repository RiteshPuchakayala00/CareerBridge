"""
Student Schemas
Spec Reference: google_sso_and_batch_eligibility_spec.md §5.C
"""
from pydantic import BaseModel
from typing import Optional, List

class StudentProfileUpdate(BaseModel):
    phone_number: Optional[str] = None
    contact_number: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: Optional[List[str]] = None
    skills_list: Optional[List[str]] = None
    bio: Optional[str] = None
    # NOTE: roll_no, cgpa, department, and graduation_year are purposefully omitted
    # per spec §3.A (Official College Master Data is locked and cannot be edited by students)

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
    skills_list: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    is_placed: int = 0

    class Config:
        from_attributes = True
