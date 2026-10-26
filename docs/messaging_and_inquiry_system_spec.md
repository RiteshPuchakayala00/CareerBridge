# Specification: Contextual Messaging, Doubt Resolution & Drive FAQ System

**Document Status:** Approved Design  
**Target Platform:** CareerBridge Placement & Internship Platform  
**Scope:** Student-Coordinator Doubt Desk, Recruiter-Coordinator Drive Logistics, and Drive FAQ Automation  

---

## 1. Executive Summary & Core Principles

Campus placement drives generate significant communication friction:
* Students have urgent, repetitive questions regarding test patterns, eligibility edge-cases, and interview dress codes.
* Department Coordinators are overwhelmed by hundreds of unorganized WhatsApp/email inquiries.
* Visiting HRs and Recruiters need quick, reliable communication channels with college staff on drive days.

To solve this, CareerBridge establishes **two strictly separated communication lanes** with the **Department Coordinator serving as the professional relay**:

```
        ┌────────────────────────────────────────────────────────┐
        │                        STUDENT                         │
        └───────────────────────────┬────────────────────────────┘
                                    │
                                    │ (Lane 1: Job Doubts & Inquiries)
                                    ▼
        ┌────────────────────────────────────────────────────────┐
        │            DEPARTMENT COORDINATOR / TPO                │
        └───────────────────────────┬────────────────────────────┘
                                    │
                                    │ (Lane 2: Drive Logistics & Escalations)
                                    ▼
        ┌────────────────────────────────────────────────────────┐
        │                       RECRUITER                        │
        └────────────────────────────────────────────────────────┘
```

> **The Shield Principle:** Students are **not permitted to directly message recruiters**. Direct student messaging often leads to spam, unprofessional inquiries, and candidate bias. The Coordinator acts as the central quality filter and professional representative.

---

## 2. Lane 1: Student $\leftrightarrow$ Coordinator (Doubt Desk)

### A. Context-Bound Inquiries (No Blank Chats)
* To prevent ambiguous messages like *"Sir, is Python allowed?"*, every student query is **mandatory-linked to a specific Job Posting** (or tagged as `General Placement Query`).
* When the Coordinator opens the inquiry, the interface displays:
  * **Drive Header:** `[Google - SWE Drive 2026] • Package: 18 LPA`
  * **Student Context:** `Jane Doe (CSE) • CGPA: 8.92 • Backlogs: 0`
  * Eliminates the *"Which company are you asking about?"* back-and-forth.

### B. Inquiry Status Lifecycle
Student inquiries operate as a lightweight helpdesk with a 2-stage status:
* **`OPEN`** (Default): New or active question awaiting coordinator reply. Displayed prominently in the Coordinator's **"Pending Doubts"** badge.
* **`RESOLVED`**: Once answered, either the student or coordinator marks the issue closed.

### C. The "Pin to Drive FAQ" Automation (Game Changer)
In any drive with 300 candidates, dozens of students will ask the identical question:
* *"Is there negative marking in the aptitude round?"*
* *"What is the reporting time and room for technical interviews?"*

Instead of typing the same reply 40 times, the Coordinator has a 1-click action:
1. Coordinator responds to the doubt: *"No negative marking. 60 questions in 60 minutes."*
2. Coordinator clicks **`[✓ Pin to Drive FAQ]`**.
3. **Automated Broadcast:** The Question and Answer are instantly published under the **"Frequently Asked Questions (FAQ)"** tab of that job posting for all eligible students.
4. **Impact:** Cuts incoming student doubt volume by over 80%.

---

## 3. Lane 2: Coordinator / TPO $\leftrightarrow$ Recruiter (Drive Logistics Chat)

For every approved and published job posting, a **dedicated private channel** is automatically opened between the visiting Recruiter HR and the Department Coordinator/TPO.

### Use Cases:
1. **Drive Day Operations:**
   * Recruiter: *"Round 1 aptitude results are finalized. Please send the first 15 shortlisted students to Lab 3."*
   * Coordinator: *"All 15 students have reported and are seated."*
2. **Clarifying Candidate Eligibility Edge-Cases:**
   * Coordinator: *"One of our top students has an ECE major with a Computer Science minor (CGPA 9.1). Would your team consider them for the software role?"*
   * Recruiter: *"Yes, please allow them to sit for the test."*
3. **Schedule Adjustments:**
   * Prompt coordination for unexpected delays, interview rescheduling, or technical link sharing.

---

## 4. Database Schema Design (Blueprint)

### A. Enumerated Types
```python
import enum

class ThreadType(str, enum.Enum):
    STUDENT_COORDINATOR = "STUDENT_COORDINATOR"    # Doubt desk
    COORDINATOR_RECRUITER = "COORDINATOR_RECRUITER"# Drive operations

class ThreadStatus(str, enum.Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
```

### B. Conversation Thread Model (`backend/app/models/message.py`)
```python
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class MessageThread(Base):
    __tablename__ = "message_threads"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=True)
    thread_type = Column(Enum(ThreadType), nullable=False)
    
    # Participants
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)      # For Lane 1
    coordinator_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # For Lane 1 & 2
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=True)    # For Lane 2
    
    subject = Column(String, nullable=False) # e.g. "Doubt regarding test format"
    status = Column(Enum(ThreadStatus), default=ThreadStatus.OPEN)
    
    # FAQ Promotion Feature
    is_pinned_faq = Column(Boolean, default=False)
    faq_question = Column(String, nullable=True)
    faq_answer = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    job = relationship("JobPosting", backref="message_threads")
    messages = relationship("ChatMessage", back_populates="thread", cascade="all, delete-orphan")
```

### C. Chat Message Model
```python
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    content = Column(Text, nullable=False)
    attachment_url = Column(String, nullable=True) # Optional screenshot/document
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User")
```

---

## 5. API Endpoints Specification

| Endpoint | Method | Allowed Roles | Description |
| :--- | :---: | :--- | :--- |
| `/api/messages/threads` | `POST` | `STUDENT`, `COORDINATOR`, `RECRUITER` | Starts a new thread (Student starts doubt; or Coordinator starts recruiter chat). |
| `/api/messages/threads` | `GET` | All Roles | Lists user's active threads (filtered by role and thread type) with unread counters. |
| `/api/messages/threads/{id}` | `GET` | Thread Participants | Fetches full conversation history and marks messages as read. |
| `/api/messages/threads/{id}/messages` | `POST` | Thread Participants | Sends a new reply message in the thread. |
| `/api/messages/threads/{id}/status` | `PATCH` | `STUDENT`, `COORDINATOR` | Toggles status between `OPEN` and `RESOLVED`. |
| `/api/messages/threads/{id}/pin-faq` | `POST` | `DEPT_COORDINATOR`, `TPO_ADMIN` | Promotes the Q&A thread into a public FAQ displayed on the Job Posting page. |
| `/api/jobs/{job_id}/faqs` | `GET` | All Roles | Fetches all pinned FAQs for a given job drive. |

---

## 6. User Interface & User Experience Design

### A. Student View
1. **On the Job Details Page (`/jobs/{id}`)**:
   * Prominent button: **`[Ask a Doubt to Coordinator]`**.
   * Clicking opens a drawer pre-filled with the Job Title.
   * Dedicated tab: **"Drive FAQs"** displaying all pinned Q&As resolved by the coordinator.
2. **Global Navbar**:
   * Chat bubble icon with unread message badge `(2)` linking to **"My Queries"**.

### B. Department Coordinator View
1. **Inquiries Desk Dashboard (`/coordinator/inquiries`)**:
   * **Split Pane Layout**:
     * Left pane: List of threads grouped by `Job Drive` with badges: `[Pending (4)]` and `[Resolved]`.
     * Right pane: Active chat conversation with student academic profile card at the top.
   * **Actions Bar**:
     * `[Mark as Resolved]` button.
     * `[Pin as Drive FAQ]` button (opens modal to review question/answer before publishing).

### C. Recruiter View
1. **On the Drive Management Dashboard (`/recruiter/drives/{id}`)**:
   * Dedicated tab: **"Coordinator Chat"** for instant coordination with college staff during test and interview days.

---

## 7. Implementation Roadmap

* **Phase 1 (Standard REST API + Polling)**:
  * Implemented using standard FastAPI endpoints and periodic client-side polling (e.g. every 15-30 seconds or on tab focus) with unread badges.
  * Robust, lightweight, and zero WebSocket connection drop issues.
* **Phase 2 (Real-Time WebSockets)**:
  * Upgrade to FastAPI WebSockets (`/ws/threads/{id}`) for typing indicators, live chat bubbles, and instant desktop push notifications.
