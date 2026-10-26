# Specification: Dynamic Interview Rounds, Company Shortlisting & Test/Meeting Link Delivery

**Document Status:** Approved Design  
**Target Platform:** CareerBridge Placement & Internship Platform  
**Scope:** Configurable Round Pipeline, Company-Controlled Shortlisting, Instant Rejection Transparency, and Link/Venue Delivery  

---

## 1. Overview & Core Decisions

During campus recruitment drives:
1. **Dynamic Round Pipeline**: No two companies hire the same way. A tech startup may need 2 technical rounds, while an IT conglomerate may require an online aptitude test, coding assessment, technical interview, and HR interview. The system must allow recruiters to configure **any number of custom rounds**.
2. **Company-Driven Shortlist Publishing**: The visiting company (Recruiter) holds direct authority to publish shortlisted candidates for each round.
3. **Transparent Rejection**: Candidates who do not clear a round are immediately marked as **`REJECTED`**, providing clear closure so they can focus on other upcoming placement drives.
4. **Logistics & Link Delivery**: Test links (HackerEarth, Mettl, etc.) and virtual interview links (Google Meet, Zoom) are delivered securely through the student dashboard alongside countdown timers and passcodes.

---

## 2. Dynamic Round Architecture (Configurable per Job)

When a recruiter creates or finalizes a job posting, they configure the sequential rounds:

```
[Job Posting Created]
        │
        ├─► Round 1: "Online Coding Assessment" ──► Type: ONLINE_TEST
        ├─► Round 2: "Technical Interview 1"    ──► Type: VIRTUAL_INTERVIEW
        ├─► Round 3: "Technical Interview 2"    ──► Type: OFFLINE_INTERVIEW
        └─► Round 4: "HR & Leadership Round"    ──► Type: VIRTUAL_INTERVIEW
```

### Round Types Supported:
* **`ONLINE_TEST`**: Aptitude, coding, or psychometric assessments on external platforms (HackerRank, Mettl, HackerEarth, Google Forms).
* **`VIRTUAL_INTERVIEW`**: Remote video interviews conducted via Google Meet, Zoom, or Microsoft Teams.
* **`OFFLINE_INTERVIEW`**: Face-to-face interviews on-campus in designated college labs or interview rooms.
* **`GROUP_DISCUSSION`**: Collaborative group assessments.

---

## 3. How Test Links & Meeting Links are Delivered to Students

Students receive clear, uncluttered instructions on their portal based on the round type:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   STUDENT DASHBOARD - ACTIVE ROUND CARD                │
├────────────────────────────────────────────────────────────────────────┤
│  🏢 Google • Software Engineer Drive 2026                              │
│  🏷️ Status: Shortlisted for Round 2 (Technical Interview)             │
│                                                                        │
│  📅 Scheduled Time: Tomorrow, Oct 28, 2026 at 10:30 AM                 │
│  🔗 Mode: Virtual (Google Meet)                                        │
│  📋 Instructions: Keep your college ID & portfolio ready               │
│                                                                        │
│  [ Join Google Meet ] (Button activates 10 mins before slot)          │
└────────────────────────────────────────────────────────────────────────┘
```

### A. Delivery for Online Assessments (`ONLINE_TEST`)
* **Company Inputs in Dashboard**:
  * **Test URL**: e.g., `https://assessment.hackerearth.com/college-drive-2026/`
  * **Test Window**: Start Date/Time $\rightarrow$ End Date/Time (e.g. `Oct 27, 10:00 AM - 12:00 PM`)
  * **Access Credentials / Passkey**: (e.g. *"Use your University Roll Number as Username & Passkey: CB@2026"*).
  * **General Guidelines**: Proctored instructions, allowed languages.
* **Student Experience**:
  * An interactive **"Online Assessment"** card appears on the student dashboard with a live countdown timer and a direct **`[Launch Test]`** button that unlocks at the scheduled time.

### B. Delivery for Virtual Interviews (`VIRTUAL_INTERVIEW`)
* **Company Inputs in Dashboard**:
  * **Meeting Link**: Google Meet, Zoom, or Microsoft Teams URL.
  * **Candidate Time Slots**: Individual slots (e.g. *10:00 AM - 10:30 AM*) or batch reporting times.
  * **Passcode / Host PIN**: (If required).
* **Student Experience**:
  * The student sees their exact scheduled slot and a **`[Join Interview]`** button (with auto-sync to Google Calendar).

### C. Delivery for Offline On-Campus Interviews (`OFFLINE_INTERVIEW`)
* **Company / Coordinator Inputs**:
  * **Campus Venue**: e.g., *"Academic Block 2, Computer Lab 4, Cabin 3"*.
  * **Reporting Time & Dress Code**: e.g., *"Reporting Time: 09:30 AM. Formal attire required"*.
  * **Required Materials**: *"Bring 2 hard copies of your resume and college ID card"*.

---

## 4. The Shortlisting & Rejection Workflow

```
[Current Round Candidates: 150 Students]
                   │
                   ▼
[Recruiter Reviews Candidates in Dashboard]
  - Filter by AI Match Score
  - Multi-select checkboxes OR Search by Roll Number
                   │
                   ├─► Selected: 35 Candidates
                   └─► Unselected: 115 Candidates
                   │
                   ▼
[Recruiter clicks: "Publish Shortlist for Next Round"]
  - Inputs Next Round Link / Time / Venue
                   │
                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                 AUTOMATED SYSTEM ACTION                │
        ├───────────────────────────────────┬────────────────────┤
        │ 35 Shortlisted Students           │ 115 Other Students │
        ├───────────────────────────────────┼────────────────────┤
        │ - Status: Advanced to Next Round  │ - Status: REJECTED │
        │ - Next Round Card & Link rendered │ - Reason: "Not     │
        │ - Alert sent to Student           │   shortlisted for  │
        │                                   │   Round X"         │
        └───────────────────────────────────┴────────────────────┘
```

### Immediate Rejection Transparency
* Rather than keeping candidates waiting in uncertainty, unselected candidates are immediately marked as **`REJECTED`**.
* This updates their application status badge to:  
  `[❌ Rejected at Round 1 - Online Assessment]`
* **Benefit**: The student knows immediately that their participation in this drive is complete and can direct their energy to other upcoming companies.

---

## 5. Database Schema Blueprint

### A. Round Configuration Model (`backend/app/models/job_round.py`)
```python
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from ..database import Base

class RoundType(str, enum.Enum):
    ONLINE_TEST = "ONLINE_TEST"
    VIRTUAL_INTERVIEW = "VIRTUAL_INTERVIEW"
    OFFLINE_INTERVIEW = "OFFLINE_INTERVIEW"
    GROUP_DISCUSSION = "GROUP_DISCUSSION"

class JobRound(Base):
    __tablename__ = "job_rounds"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    
    round_number = Column(Integer, nullable=False) # 1, 2, 3...
    name = Column(String, nullable=False)          # e.g., "Coding Assessment"
    round_type = Column(Enum(RoundType), nullable=False)
    description = Column(Text, nullable=True)      # Instructions/Syllabus
    
    # Logistics & Links
    test_url = Column(String, nullable=True)       # For ONLINE_TEST
    meeting_url = Column(String, nullable=True)    # For VIRTUAL_INTERVIEW
    venue = Column(String, nullable=True)          # For OFFLINE_INTERVIEW (Lab/Room)
    access_code = Column(String, nullable=True)    # Test passkey or meeting PIN
    
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    job = relationship("JobPosting", backref="rounds")
```

### B. Application Round State (`backend/app/models/application.py`)
```python
class AppStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    IN_PROGRESS = "IN_PROGRESS" # Active in rounds
    OFFERED = "OFFERED"
    REJECTED = "REJECTED"

# Add current round pointer to Application table:
# current_round_id = Column(Integer, ForeignKey("job_rounds.id"), nullable=True)
# scheduled_slot = Column(DateTime(timezone=True), nullable=True)
# rejection_round_number = Column(Integer, nullable=True)
```

---

## 6. Endpoints Blueprint

| Endpoint | Method | Allowed Roles | Description |
| :--- | :---: | :--- | :--- |
| `/api/jobs/{id}/rounds` | `POST` | `RECRUITER` | Defines the sequence of rounds for a job posting. |
| `/api/jobs/{id}/rounds` | `GET` | All Roles | Lists all configured rounds and their types for a drive. |
| `/api/jobs/{id}/rounds/{round_id}/logistics` | `PATCH` | `RECRUITER`, `COORDINATOR` | Updates test links, meeting links, venue, and time windows. |
| `/api/jobs/{id}/rounds/{round_id}/shortlist` | `POST` | `RECRUITER` | Publishes shortlisted candidate IDs. Advances them to the next round and automatically marks all others as `REJECTED`. |
| `/api/applications/my-applications` | `GET` | `STUDENT` | Returns student applications with current round tracker, scheduled slots, and active test/meeting launch buttons. |
