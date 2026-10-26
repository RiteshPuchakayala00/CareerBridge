# Specification: Job Lifecycle, Coordinator Approval Pipeline & Eligibility Engine

**Document Status:** Approved Design  
**Target Platform:** CareerBridge Placement & Internship Platform  
**Scope:** Recruiter Job Creation, Department Coordinator Approval Pipeline, Single-Offer Policy, and the 5-Rule Eligibility Engine  

---

## 1. Overview & Core Principles

Campus placement drives differ significantly from public job boards (like LinkedIn or Indeed) due to strict institutional regulations:
1. **Quality Control & Scheduling**: Recruiters cannot post directly to students. Job opportunities must be reviewed and approved by the **Department Coordinator** (or Central TPO) to verify CTC, job roles, and ensure drive dates do not conflict with university examinations.
2. **The "One-Offer" Policy (Equitable Placement Rule)**: Once a student receives an official job offer (`OFFERED`), they are barred from participating in subsequent placement drives. This ensures that job offers are distributed fairly and prevents high-scoring students from hoarding multiple offers while peers remain unplaced.
3. **Automated Eligibility Engine**: A two-tier screening engine that validates student eligibility against 5 mandatory criteria, providing real-time UI guidance and preventing ineligible applications at the API level.

---

## 2. Job Posting & Coordinator Approval Lifecycle

```
[RECRUITER]
   │
   ├─► Fills Job Details:
   │   - Title, Description, Location, Job Type, CTC/Stipend
   │   - Min CGPA Cutoff
   │   - Allowed Departments (e.g. CSE, IT, ECE)
   │   - Max Allowed Backlogs (e.g. 0 or 1)
   │   - Application Deadline
   │
   ▼
[Job Status: `PENDING_APPROVAL`] ── (Hidden from Students)
   │
   ▼
[DEPT_COORDINATOR / TPO_ADMIN]
   │
   ├─► Reviews in "Pending Drives" Dashboard
   │   - Checks CTC validity & role quality
   │   - Ensures drive schedule does not clash with semester exams
   │
   ├───► [REJECT / REQUEST REVISION] ──► Recruiter notified with feedback
   │
   └───► [APPROVE & PUBLISH]
            │
            ▼
   [Job Status: `PUBLISHED`]
      - Live on Student Dashboard for eligible branches
      - Countdown timer to Application Deadline starts
            │
            ▼
   [DEADLINE REACHED / DRIVE COMPLETED]
      - Status transitions to `CLOSED`
      - "Apply" button automatically locks
```

---

## 3. The 5-Rule Eligibility Engine

When a student browses or applies to any campus drive, the **Eligibility Engine** evaluates 5 criteria in order:

```
                  ┌─────────────────────────────────────────┐
                  │          STUDENT APPLIES TO JOB         │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Rule 1: One-Offer Rule Check                            │
 │ Does student already have an accepted/active offer?     │── YES ──► ❌ INELIGIBLE ("Already Placed")
 └─────────────────────────┬───────────────────────────────┘
                           │ NO
                           ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Rule 2: Job Status & Deadline Check                     │
 │ Is job status == PUBLISHED and now <= deadline?         │── NO ──► ❌ INELIGIBLE ("Drive Closed/Expired")
 └─────────────────────────┬───────────────────────────────┘
                           │ YES
                           ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Rule 3: CGPA Cutoff Check                               │
 │ Is student.cgpa >= job.eligibility_cgpa?                │── NO ──► ❌ INELIGIBLE ("CGPA below Cutoff")
 └─────────────────────────┬───────────────────────────────┘
                           │ YES
                           ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Rule 4: Department / Branch Check                       │
 │ Is student.department in job.eligible_departments?      │── NO ──► ❌ INELIGIBLE ("Branch not eligible")
 └─────────────────────────┬───────────────────────────────┘
                           │ YES
                           ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Rule 5: Customizable Backlogs Check                     │
 │ Is student.active_backlogs <= job.max_backlogs?         │── NO ──► ❌ INELIGIBLE ("Backlogs exceed limit")
 └─────────────────────────┬───────────────────────────────┘
                           │ YES
                           ▼
              ┌────────────────────────┐
              │  ✅ ELIGIBLE TO APPLY  │
              └────────────────────────┘
```

---

### Detailed Specification of the 5 Rules

#### Rule 1: The "One-Offer" Policy (Single-Offer Enforcement)
* **Definition**: If a student has any application with status `OFFERED` (or `is_placed == True`), they are classified as **Placed**.
* **System Action**:
  * Blocked from applying to all other placement drives.
  * System Feedback:  
    `"Ineligible: You have already secured an offer with [Company Name]. Under college placement policy, placed students cannot participate in further drives."`

#### Rule 2: Active Job & Deadline Enforcement
* **Definition**: Jobs must be officially approved (`status == PUBLISHED`) and the current timestamp must not exceed `job.deadline`.
* **System Action**:
  * If deadline has passed:  
    `"Ineligible: Application deadline (YYYY-MM-DD HH:MM) for this drive has expired."`

#### Rule 3: Minimum CGPA Cutoff
* **Definition**: Student's locked official university CGPA must meet or exceed the recruiter's threshold.
* **System Action**:
  * If `student.cgpa < job.eligibility_cgpa`:  
    `"Ineligible: Requires minimum {job.eligibility_cgpa} CGPA, but your current CGPA is {student.cgpa}."`

#### Rule 4: Department / Branch Restriction
* **Definition**: Student's official branch must belong to `job.eligible_departments` (e.g. `["CSE", "IT"]`).
* **System Action**:
  * If student's branch is not listed:  
    `"Ineligible: Drive is open only for [{allowed_branches}]. Your department is {student.department}."`

#### Rule 5: Recruiter-Customizable Backlogs Allowance
* **Definition**: The recruiter specifies `max_backlogs` during job creation:
  * `0` $\rightarrow$ Strict zero active backlogs allowed (default for Tier-1 firms).
  * `1` or `2` $\rightarrow$ Flexible allowance set by recruiter.
* **System Action**:
  * If `student.active_backlogs > job.max_backlogs`:  
    `"Ineligible: Company allows a maximum of {job.max_backlogs} active backlog(s), but you currently have {student.active_backlogs} active backlog(s)."`

---

## 4. Two-Tier Verification Architecture

To provide an intuitive student user experience while ensuring strict backend security:

### Tier 1: Dynamic Visual Badges (Preview / Browse Mode)
* When a student views the Jobs page (`GET /api/jobs`):
  * The backend computes eligibility on-the-fly for every job.
  * The response includes:
    * `is_eligible: true / false`
    * `eligibility_reasons: ["Detailed explanation if false"]`
    * `has_applied: true / false`
  * **Frontend UI Rendering**:
    * **Eligible Job**: Displays a green badge: `[Eligible - Apply Now]`.
    * **Ineligible Job**: Displays an amber/gray badge with tooltip: `[Ineligible: CGPA below 7.5]` and a disabled Apply button.
    * **Already Placed Student**: Global banner: *"Congratulations! You have been placed at [Company]. Further drive applications are locked."*

### Tier 2: Hard Security Gate (API Protection)
* When a student triggers `POST /api/jobs/{id}/apply`:
  * The backend independently re-runs all 5 eligibility rules from verified database records.
  * If any rule fails, the request is immediately rejected with HTTP `403 Forbidden` and the failure reasons.
  * Direct API tampering (e.g., Postman / curl) is completely impossible.

---

## 5. Database Model Updates (Blueprint)

### A. Job Posting Model (`backend/app/models/job.py`)
```python
import enum
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class JobStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"  # Awaiting Coordinator/TPO review
    PUBLISHED = "PUBLISHED"                # Live for students
    CLOSED = "CLOSED"                      # Deadline passed or drive concluded
    REJECTED = "REJECTED"                  # Rejected by Coordinator

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String)
    job_type = Column(String)              # Full-Time, Internship, 6M+PPO
    ctc_lpa = Column(Float, nullable=True) # Package in LPA
    
    # Eligibility Criteria
    eligibility_cgpa = Column(Float, default=0.0)
    eligible_departments = Column(JSON, default=list) # e.g. ["CSE", "IT", "ECE"]
    max_backlogs = Column(Integer, default=0)         # Customizable by recruiter
    target_batch_year = Column(Integer, nullable=True)# e.g. 2026
    
    # Approval Pipeline
    status = Column(Enum(JobStatus), default=JobStatus.PENDING_APPROVAL)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(String, nullable=True)
    
    deadline = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    company = relationship("Company", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
```

---

## 6. Endpoints Blueprint

| Endpoint | Method | Allowed Roles | Description |
| :--- | :---: | :--- | :--- |
| `/api/jobs` | `POST` | `RECRUITER`, `TPO_ADMIN` | Recruiter creates job $\rightarrow$ saved with status `PENDING_APPROVAL`. |
| `/api/jobs/pending` | `GET` | `DEPT_COORDINATOR`, `TPO_ADMIN` | Coordinator views jobs awaiting review for their branch. |
| `/api/jobs/{id}/approve` | `PATCH`| `DEPT_COORDINATOR`, `TPO_ADMIN` | Approves job $\rightarrow$ status changes to `PUBLISHED`. |
| `/api/jobs/{id}/reject` | `PATCH`| `DEPT_COORDINATOR`, `TPO_ADMIN` | Rejects job with feedback reason. |
| `/api/jobs` | `GET` | All Roles | Lists jobs. For `STUDENT`, returns personalized eligibility tags (`is_eligible`, `reasons`). |
| `/api/jobs/{id}` | `GET` | All Roles | Full drive details + student eligibility status breakdown. |
| `/api/jobs/{id}/apply` | `POST` | `STUDENT` | Submits application with strict 5-rule eligibility enforcement. |
