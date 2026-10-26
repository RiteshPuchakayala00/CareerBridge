# Specification: CareerBridge 4-Role System Architecture, Permissions & Credential Governance

**Document Status:** Approved Design  
**Target Platform:** CareerBridge Placement & Internship Platform  
**Scope:** Role-Based Access Control (RBAC), Credential Provisioning, and Functional Boundaries  

---

## 1. System Overview & The 4 Roles

CareerBridge operates on an authoritative 4-tier role hierarchy designed to mirror modern university placement ecosystems:

```
                    ┌─────────────────────────────────────────┐
                    │        College IT / Initial Seed        │
                    └────────────────────┬────────────────────┘
                                         │ (Provisions Root Admin)
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │        Central TPO (`TPO_ADMIN`)        │
                    └────────┬───────────────────────┬────────┘
                             │                       │
      (Appoints & binds dept)│                       │(Invites directly via HR email)
                             ▼                       ▼
            ┌────────────────────────┐      ┌────────────────────────┐
            │   `DEPT_COORDINATOR`   │      │      `RECRUITER`       │
            │     (Faculty SPOC)     │      │   (Company HR/Talent)  │
            └───────────┬────────────┘      └───────────┬────────────┘
                        │(Reaches out & invites)        │
                        └──────────────┐ ┌──────────────┘
                                       ▼ ▼
                    ┌─────────────────────────────────────────┐
                    │                `STUDENT`                │
                    │   (Enrolled, whitelisted via CSV roster) │
                    └─────────────────────────────────────────┘
```

---

## 2. Deep Dive: Role 1 — Central TPO Admin (`TPO_ADMIN`)

### A. Who They Are
The Head of the Training & Placement Cell and senior placement officers responsible for college-wide recruitment policies, accreditation metrics, and company relations.

### B. How Credentials & Access are Provided
* **Initial Root Provisioning**: The primary `TPO_ADMIN` account is provisioned during server deployment (via `backend/seed.py` or administrative CLI script).
* **Secondary Staff Addition**: An existing `TPO_ADMIN` can add fellow placement officers from the TPO Dashboard (`Settings -> Manage Staff`).
* **Authentication Method**: Official College Google Workspace account (`@college.edu`) via Google SSO, with an optional email + password fallback.

### C. Functions & Allowed Capabilities
1. **Master Roster Management**: Upload official student master CSV files containing Roll No, Name, College Email, Department, Graduation Year, and CGPA.
2. **Dynamic Batch Eligibility Control**: Toggle login access for specific graduation batches (e.g., enable 4th-year 2026 batch for full-time drives, enable 3rd-year 2027 batch for summer internships, block 1st/2nd years).
3. **Faculty Coordinator Governance**: Appoint and decommission `DEPT_COORDINATOR` accounts and bind them to their respective academic departments (CSE, ECE, MECH, etc.).
4. **Recruiter Onboarding**: Directly invite corporate HRs via company email and grant access to the portal.
5. **Job & Drive Governance**: Review, approve, or edit any campus placement drive proposed by recruiters or department coordinators.
6. **College-Wide Analytics & Accreditation**:
   * Complete placement percentages, average/highest CTC, offers distribution.
   * Export NIRF, NAAC, and state accreditation compliance reports.

### D. Strict Restrictions
* Cannot bypass or alter academic audit logs once a student placement offer is officially recorded.

---

## 3. Deep Dive: Role 2 — Department Coordinator (`DEPT_COORDINATOR`)

### A. Who They Are
Senior faculty members appointed by the Department Head (HOD) or Principal as the Placement SPOC for a specific discipline (e.g., CSE Placement Coordinator).

### B. How Credentials & Access are Provided
* **Authorization Basis**: Formal faculty appointment letter from the HOD/Principal.
* **Provisioning Mechanism**:
  1. The `TPO_ADMIN` enters the coordinator’s official faculty email (`sharma.cse@college.edu`), full name, and binds their academic department (`CSE`).
  2. The account is instantly whitelisted in the database with role `DEPT_COORDINATOR` and `department="CSE"`.
* **Authentication Method (Zero Password)**:
  * Since the faculty already has an institutional Google Workspace account, **no password is created**.
  * The coordinator clicks **"Sign in with College Google ID"**.
  * The system recognizes their whitelisted email, matches the `CSE` department binding, and routes them to the Coordinator Dashboard.

### C. Functions & Allowed Capabilities
1. **Company Outreach & Recruiter Invitations**:
   * Add company HR emails to send official invitations for campus placement drives tailored to their branch.
   * Track outreach pipelines (`Contacted` $\rightarrow$ `Negotiation` $\rightarrow$ `Drive Confirmed` $\rightarrow$ `Declined`).
2. **Drive Initiation**:
   * Propose a new placement/internship drive for their branch (Role, CTC, Eligibility, Proposed Date) for TPO approval.
3. **Department-Scoped Student Supervision**:
   * **Strict Branch Isolation**: A CSE coordinator can **only** see CSE students.
   * **Unplaced Student Radar**: 1-click filter for students needing attention (e.g., *"Show 4th-year CSE students with CGPA $\ge$ 7.0 with 0 offers"*).
   * Review students' resume uploads and AI readiness match scores.
4. **Drive Day Coordination**:
   * Mark attendance for aptitude rounds, interview rooms, and manage candidate queues during on-campus drive days.
5. **Department Accreditation Exports**:
   * Export branch-specific placement data (Excel/PDF) for departmental NBA/NAAC reviews.

### D. Strict Restrictions
* **Zero Cross-Department Access**: Cannot view or modify students, applications, or statistics of any other department.
* **No Global Policy Control**: Cannot change global batch login permissions or college-wide settings.
* **No Academic Tampering**: Cannot edit students' official CGPA or university records.

---

## 4. Deep Dive: Role 3 — Recruiter (`RECRUITER`)

### A. Who They Are
External Talent Acquisition managers, HR professionals, or technical hiring leads from visiting companies (e.g., Google, Amazon, TCS, Tata Motors).

### B. How Credentials & Access are Provided (Invite-Based Model)
To maintain security and prevent unverified accounts:
1. **Initiation**: Either the `TPO_ADMIN` or the `DEPT_COORDINATOR` adds the official HR corporate email (e.g., `priya.hr@techcorp.com`) along with the Company Name in the portal.
   * *Anti-Abuse Rule*: Free public email domains (`@gmail.com`, `@yahoo.com`, `@outlook.com`) are rejected; only corporate domain emails are allowed.
2. **Invitation Email**:
   * The platform sends an automated onboarding email containing a cryptographically secure, time-limited activation token:
     * *"You have been invited by College Placement Cell to recruit for the Batch of 2026. Click here to activate your recruiter account."*
3. **Account Activation**:
   * The recruiter clicks the link, sets a secure password, and completes their company profile (logo, website, corporate bio).
4. **Authentication Method**:
   * Recruiter signs in using Corporate Email + Password via standard OAuth2 password flow.

### C. Functions & Allowed Capabilities
1. **Company Profile Management**: Maintain company bio, logo, website, and industry category.
2. **Job & Internship Postings**:
   * Create detailed job openings with specific eligibility criteria:
     * Minimum CGPA (e.g., $\ge 7.5$)
     * Eligible Departments (e.g., `["CSE", "IT", "ECE"]`)
     * Allowed Maximum Backlogs (e.g., `0`)
     * CTC in LPA / Monthly Internship Stipend
     * Application Deadline and Drive Date
3. **Applicant Evaluation & AI Match Screening**:
   * Review eligible students who applied.
   * View candidate resumes and Gemini AI match scores ($0 - 100\%$) detailing skill fit and gap analysis.
4. **Application Pipeline Management**:
   * Transition candidate stages: `APPLIED` $\rightarrow$ `SHORTLISTED` $\rightarrow$ `INTERVIEW` $\rightarrow$ `OFFERED` or `REJECTED`.
5. **Interview Scheduling**: Post interview slots and meeting links (or room details) directly to shortlisted students.

### D. Strict Restrictions
* **No Ineligible Candidate Access**: Cannot view student profiles of candidates who do not meet their job eligibility criteria unless approved by TPO.
* **No Tampering with College Records**: Cannot alter student academic info or college policies.

---

## 5. Deep Dive: Role 4 — Student (`STUDENT`)

### A. Who They Are
Enrolled undergraduate or postgraduate students seeking internships or full-time campus placements.

### B. How Credentials & Access are Provided
1. **Pre-Authorization via TPO Master CSV**:
   * Student master records (`student_name, roll_no, email, year, cgpa, department`) are uploaded by TPO.
   * No password is generated.
2. **Dynamic Batch Gatekeeper**:
   * The system verifies that the student’s `graduation_year` is marked as active in `BatchEligibility`.
3. **Authentication Method (Google Workspace SSO)**:
   * Student clicks **"Sign in with College Google ID"**.
   * Backend validates the Google ID Token, verifies `hd == college.edu`, and checks that the email is pre-registered in the TPO roster and is in an active batch.
   * Upon successful match, CareerBridge issues a session JWT.

### C. Functions & Allowed Capabilities
1. **View Locked Academic Record**: View official verified credentials (Roll No, CGPA, Branch, Batch) marked with an official verified badge 🔒.
2. **Profile Enrichment**:
   * Upload / replace PDF resume.
   * Add LinkedIn, GitHub, and Portfolio URLs.
   * Update personal contact number and bio.
   * View extracted skills parsed by Gemini AI.
3. **Job Exploration & Automated Eligibility Checks**:
   * Browse all active campus placement and internship drives.
   * The system automatically displays whether the student is **Eligible** or **Ineligible** with exact explanations (e.g., *"Ineligible: Requires minimum 8.0 CGPA; your CGPA is 7.4"*).
4. **1-Click Application**: Apply to eligible drives with their selected resume.
5. **Application Status Tracking**: Real-time pipeline tracker showing status (`APPLIED`, `SHORTLISTED`, `INTERVIEW`, `OFFERED`, `REJECTED`).
6. **AI Preparation & Skill Gap Feedback**: View AI feedback highlighting which skills on their resume match the job description and recommended interview prep topics.

### D. Strict Restrictions
* **Locked Academic Integrity**: Under no circumstances can students modify their CGPA, Roll Number, Department, or Graduation Year.
* **Eligibility Enforced by Backend**: Cannot submit an application to a job if they do not meet the CGPA, backlog, or department criteria.

---

## 6. Comprehensive RBAC Permission Matrix

| Action / Capability | `TPO_ADMIN` | `DEPT_COORDINATOR` | `RECRUITER` | `STUDENT` |
| :--- | :---: | :---: | :---: | :---: |
| **Login via College Google SSO** | ✅ | ✅ | ❌ (Corporate Email) | ✅ |
| **Upload Master Student CSV** | ✅ | ❌ | ❌ | ❌ |
| **Toggle Batch Login Access** | ✅ | ❌ | ❌ | ❌ |
| **Appoint / Remove Coordinators** | ✅ | ❌ | ❌ | ❌ |
| **View Students Across College** | ✅ (All) | ❌ (Own Dept Only) | ❌ (Applicants Only)| ❌ |
| **Invite New Recruiters via HR Email**| ✅ | ✅ | ❌ | ❌ |
| **Create / Post Job Openings** | ✅ | ✅ (Proposal) | ✅ | ❌ |
| **Edit Student CGPA / Dept** | ✅ (Admin only)| ❌ | ❌ | ❌ |
| **Upload / Update Resume** | ❌ | ❌ | ❌ | ✅ |
| **Apply for Job Openings** | ❌ | ❌ | ❌ | ✅ |
| **Shortlist / Offer Candidates** | ✅ (Override)| ❌ | ✅ | ❌ |
| **Mark Drive Attendance** | ✅ | ✅ (Own Dept) | ❌ | ❌ |
| **Export Accreditation Reports** | ✅ (College) | ✅ (Dept Only) | ❌ | ❌ |

---

## 7. End-to-End Inter-Role Recruitment Lifecycle

```
[DEPT_COORDINATOR or TPO_ADMIN]
        │
        ├─► Enters HR Email (hr@techcorp.com) ──► Recruiter receives Activation Email
        │
[RECRUITER]
        │
        ├─► Sets Password, completes Company Profile
        ├─► Submits Job Posting (e.g., Software Engineer: Min 7.5 CGPA, CSE/IT, 12 LPA)
        │
[TPO_ADMIN / DEPT_COORDINATOR]
        │
        ├─► Reviews & Approves Job Posting ──► Published on Student Portals
        │
[STUDENT]
        │
        ├─► Logs in via College Google SSO
        ├─► System checks: CGPA 8.2 >= 7.5, Dept CSE -> ELIGIBLE
        ├─► Student clicks "Apply with Resume"
        │
[AI ENGINE (Gemini)]
        │
        ├─► Compares Resume vs Job Description -> Match Score: 88%
        │
[RECRUITER]
        │
        ├─► Reviews applicants sorted by Match Score
        ├─► Moves candidate: APPLIED -> SHORTLISTED -> INTERVIEW -> OFFERED
        │
[DEPT_COORDINATOR & TPO_ADMIN]
        │
        └─► Student marked as PLACED; statistics update automatically in real-time
```
