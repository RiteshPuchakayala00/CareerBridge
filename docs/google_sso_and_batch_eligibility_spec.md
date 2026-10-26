# Specification: Google SSO, Dynamic Batch Whitelisting & Locked Academic Profiles

**Document Status:** Approved for Future Implementation  
**Target Platform:** CareerBridge Campus Placement System  
**Category:** Authentication, Security, and Student Data Integrity  

---

## 1. Overview & Objectives

In a university campus placement setting:
1. **Zero-Trust Access Control**: Only students enrolled in authorized academic years (e.g., 4th-year graduating batch or 3rd-year internship candidates) should be permitted to log in. Younger batches (1st and 2nd years) must be barred until their placement cycle commences.
2. **Frictionless Google SSO**: Students should not have to manually register or create passwords; they authenticate directly with their official institutional Google Workspace account (`@college.edu`).
3. **Data Integrity (Locked Profiles)**: Sensitive academic criteria (CGPA, Roll Number, Department, Batch Year) are verified university master records loaded by the Training and Placement Officer (TPO). Students cannot tamper with or alter these fields, preventing fraudulent job applications.

---

## 2. Architectural Flow

```
[Student clicks "Sign in with College Google ID"]
                   │
                   ▼
  [Google OAuth returns Google ID Token (JWT)]
                   │
                   ▼
  [Frontend: POST /api/auth/google with token]
                   │
                   ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 1. Verify Google Signature with Google Public Certs     │── Invalid ──> 401 Unauthorized
 └─────────────────────────────────────────────────────────┘
                   │ Valid
                   ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 2. Domain Validation (hd == "college.edu")              │── Personal Gmail ──> 403 Forbidden
 └─────────────────────────────────────────────────────────┘
                   │ College Domain Verified
                   ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 3. Master Roster Check (User & StudentProfile exist)    │── Not in Roster ──> 403 Forbidden
 └─────────────────────────────────────────────────────────┘
                   │ Found
                   ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 4. Dynamic Batch Whitelist Check (BatchEligibility DB)  │── Batch Blocked ──> 403 Forbidden
 │    e.g., Is 2026 Batch currently active for placement?  │    (Clear reason displayed)
 └─────────────────────────────────────────────────────────┘
                   │ Active Batch
                   ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 5. Issue CareerBridge Session JWT Token                 │
 │    Redirect Student directly to Student Dashboard       │
 └─────────────────────────────────────────────────────────┘
```

---

## 3. Profile Field Classification (Security Boundary)

To eliminate application fraud, profile fields are strictly divided:

### A. Read-Only (Official College Master Data — Ingested via TPO CSV)
* **Student Name & Roll Number** (Official identity)
* **Institutional Email** (`name@college.edu`)
* **Department / Branch** (e.g., `CSE`, `ECE`, `IT`)
* **Graduation Year / Batch** (e.g., `2026`)
* **CGPA & Active Backlogs** (Primary screening metrics)

*Note: If semester grade updates occur, TPO re-uploads an updated CSV or approves official grade-sheet update requests.*

### B. Editable by Student (Enrichment Data)
* **Resume PDF** (Upload / re-upload anytime to `backend/uploads/resumes/`)
* **Technical Skills** (Auto-parsed by Gemini AI + manually added tags)
* **Portfolio & Social Links** (GitHub, LinkedIn, personal website)
* **Contact Details** (Mobile number, alternate email)
* **Bio / Career Objectives**

---

## 4. Why Dynamic Batch Control (Database-Driven) Was Chosen

Instead of static configuration in `.env` (which requires server restarts and developer intervention), **Dynamic Batch Control** provides:
* **TPO Autonomy**: Placement officers toggle access directly from the TPO Dashboard via switches.
* **Instant Activation/Deactivation**: Zero server downtime.
* **Granular Drive Control**: Allows enabling 3rd years for summer internships in January while keeping full-time drives for 4th years only.

---

## 5. Technical Blueprint

### A. TPO CSV Onboarding Format
The TPO bulk-onboarding file format (`students_onboarding.csv`):
```csv
student_name,roll_no,email,year,cgpa,department
Alice Johnson,22CS001,alice.j@college.edu,2026,8.75,CSE
Bob Smith,22EC014,bob.s@college.edu,2026,7.40,ECE
Charlie Brown,23IT045,charlie.b@college.edu,2027,8.20,IT
David Miller,24CS110,david.m@college.edu,2028,6.90,CSE
```

### B. Database Models

#### 1. Dynamic Batch Eligibility (`backend/app/models/batch_eligibility.py`)
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base

class BatchEligibility(Base):
    __tablename__ = "batch_eligibility"

    id = Column(Integer, primary_key=True, index=True)
    graduation_year = Column(Integer, unique=True, index=True, nullable=False) # e.g., 2026
    label = Column(String, nullable=False)                                     # e.g., "4th Year (Batch 2022-2026)"
    is_login_allowed = Column(Boolean, default=True)                           # Master toggle
    allow_internships = Column(Boolean, default=False)
    allow_full_time = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

#### 2. Student Profile Additions (`backend/app/models/student.py`)
* Add editable fields:
  * `phone_number = Column(String, nullable=True)`
  * `linkedin_url = Column(String, nullable=True)`
  * `github_url = Column(String, nullable=True)`
  * `portfolio_url = Column(String, nullable=True)`
  * `skills_list = Column(JSON, nullable=True)`
  * `bio = Column(String, nullable=True)`

### C. Pydantic Schemas

#### Student Profile Update Schema (`backend/app/schemas/student.py`)
```python
from pydantic import BaseModel, HttpUrl
from typing import Optional, List

class StudentProfileUpdate(BaseModel):
    phone_number: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: Optional[List[str]] = None
    bio: Optional[str] = None
    # NOTE: roll_no, cgpa, department, and graduation_year are purposefully omitted
```

### D. Endpoints to Implement

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/google` | `POST` | Public | Validates Google ID token, verifies domain & batch eligibility, returns JWT. |
| `/api/tpo/batches` | `GET` | `TPO_ADMIN` | Lists all graduation batches and their current status. |
| `/api/tpo/batches/{year}/toggle` | `PATCH` | `TPO_ADMIN` | Toggles login eligibility for a specific batch. |
| `/api/tpo/students/bulk-import` | `POST` | `TPO_ADMIN` | Uploads official student master CSV. |
| `/api/students/me` | `GET` | `STUDENT` | Returns full student profile (both locked and editable info). |
| `/api/students/me` | `PUT` | `STUDENT` | Updates allowed editable fields (skills, links, phone, bio). |

---

## 6. Frontend UI Components to Build

1. **Login Page (`Login.jsx`)**:
   * Add prominent **"Sign in with College Google ID"** button using `@react-oauth/google`.
   * Display contextual error messages if rejected (e.g., *"Placement registration is currently restricted to graduating 2026 batch"*).
2. **Student Profile View**:
   * Official fields (CGPA, Roll No, Dept) styled with a padlock icon 🔒 and badge: *"Verified University Record"*.
   * Editable fields (Resume, Projects, Skills) with clear edit actions.
3. **TPO Admin Batch Manager Tab**:
   * Table of batches (2025, 2026, 2027, 2028) with interactive toggle switches for quick placement season control.
