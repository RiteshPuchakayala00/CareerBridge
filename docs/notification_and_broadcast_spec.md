# Specification: In-App Notification Center, Targeted Broadcasts & Urgent Flash Banners

**Document Status:** Approved Design  
**Target Platform:** CareerBridge Placement & Internship Platform  
**Scope:** In-App Notification Hub, Event-Driven Triggers, Targeted TPO/Coordinator Broadcasts, and Urgent Flash Announcements  

---

## 1. Overview & Core Principles

Prompt and reliable communication is vital during campus placement drives:
1. **Focus on In-App Delivery (Phase 1)**: All alerts are centralized within the web application using an interactive **Notification Bell Center 🔔** and sticky **Flash Announcement Banners**. (External SMTP Email delivery is deferred to a future phase).
2. **Targeted Audience Filtering**: Broadcasts can be laser-focused to specific cohorts (e.g., *Only Unplaced 4th-Year CSE students* or *Only Applicants of Company X*), preventing spam and notification fatigue.
3. **Coordinator Boundary**: Department Coordinators can only broadcast announcements to students within their own assigned branch (e.g., CSE Coordinator broadcasts strictly to CSE). Central TPO Admins have universal college-wide broadcast authority.

---

## 2. Notification Architecture & Channels

```
                        ┌─────────────────────────────────────────┐
                        │      CAREERBRIDGE NOTIFICATION HUB      │
                        └────────────────────┬────────────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   ▼                                                   ▼
      ┌────────────────────────┐                          ┌────────────────────────┐
      │   MANUAL BROADCASTS    │                          │ AUTOMATED EVENT ALERTS │
      │ (TPO / Coordinator     │                          │ (System Triggered      │
      │   Targeted Circulars)  │                          │   Lifecycle Triggers)  │
      └────────────┬───────────┘                          └────────────┬───────────┘
                   │                                                   │
                   ▼                                                   ▼
      ┌────────────────────────┐                          ┌────────────────────────┐
      │  Urgent Flash Banners  │                          │ Notification Bell Tray │
      │  (Sticky Top Ribbon)   │                          │ (Dropdown with Badges) │
      └────────────────────────┘                          └────────────────────────┘
```

---

## 3. In-App Notification Center (The Core Web Experience)

### A. The Global Notification Bell 🔔
* Located in the top navigation bar of the application.
* Displays a real-time red unread badge counter: `(3)`.
* Clicking the bell opens a slide-out tray displaying recent notifications.

### B. Notification Categories & Deep Linking
Each notification includes an icon, clear copy, relative timestamp, and a **direct action link**:

| Category Icon | Trigger Event | Notification Text | Direct Action |
| :---: | :--- | :--- | :--- |
| 💼 | **New Job Drive** | *"Google has announced SWE Drive (18 LPA). Check eligibility."* | `[View Drive]` |
| ⏰ | **Deadline Alert** | *"TechCorp application deadline closes in 3 hours."* | `[Apply Now]` |
| 🎯 | **Shortlist Result** | *"Congratulations! You have been shortlisted for Round 2 by Amazon."* | `[View Details]` |
| 📹 | **Interview Approaching** | *"Your Technical Interview starts in 30 minutes. Be ready."* | `[Join Google Meet]` |
| 💬 | **Coordinator Reply** | *"Dr. Sharma replied to your query regarding TCS test syllabus."* | `[Open Chat]` |
| 📜 | **Offer Letter** | *"Official Offer Letter issued by Infosys (8.5 LPA)!"* | `[Review Offer]` |

* **Single-Click Actions**:
  * **"Mark as Read"**: Clears individual alerts.
  * **"Mark all as read"**: Resets the unread badge to zero.

---

## 4. Manual Targeted Broadcasts & Urgent Flash Banners

### A. Audience Targeting Filters (TPO & Coordinator)
When a TPO Admin or Department Coordinator crafts an announcement, they select specific delivery criteria:
1. **Target Graduation Year**: e.g., `2026` (4th Years) or `2027` (3rd Years).
2. **Target Departments**: e.g., `["CSE", "IT"]` or `All Departments` (TPO only).
3. **Target Placement Status**:
   * `ALL`: Sent to everyone in the cohort.
   * `UNPLACED_ONLY`: Essential for special remedial drives (e.g. *"Drive open exclusively for unplaced students with CGPA $\ge$ 6.5"*).
   * `PLACED_ONLY`: For post-placement orientation circulars.
4. **Target Drive Applicants**: Sent exclusively to students who applied for a specific `job_id` (e.g. *"All Microsoft applicants report to Auditorium by 09:00 AM"*).

### B. Urgent Flash Announcement Banners (Sticky Ribbon)
* For emergency or time-critical notices (e.g., severe weather changes, sudden room reassignments, or test server extensions).
* When marked **`URGENT`**, the announcement renders as a sticky, high-visibility ribbon at the top of the student dashboard:
  ```
  📢 URGENT: Heavy rain alert. Today's TCS technical interviews are moved to Google Meet. Check your portal for updated meeting links. [Dismiss ✕]
  ```
* Remains visible until the student acknowledges or dismisses it.

---

## 5. Database Schema Blueprint

### A. Individual Notification Model (`backend/app/models/notification.py`)
```python
import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from ..database import Base

class NotificationCategory(str, enum.Enum):
    JOB_ALERT = "JOB_ALERT"
    SHORTLIST = "SHORTLIST"
    INTERVIEW_REMINDER = "INTERVIEW_REMINDER"
    INQUIRY_REPLY = "INQUIRY_REPLY"
    OFFER = "OFFER"
    BROADCAST = "BROADCAST"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    category = Column(Enum(NotificationCategory), default=NotificationCategory.BROADCAST)
    
    action_url = Column(String, nullable=True) # e.g., "/jobs/14" or "/applications"
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### B. Broadcast Announcement Model (`backend/app/models/broadcast.py`)
```python
class BroadcastPriority(str, enum.Enum):
    NORMAL = "NORMAL"
    URGENT = "URGENT" # Renders as Flash Banner

class BroadcastAnnouncement(Base):
    __tablename__ = "broadcast_announcements"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False) # TPO or Coordinator
    
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    priority = Column(Enum(BroadcastPriority), default=BroadcastPriority.NORMAL)
    
    # Targeting Filters
    target_batch_year = Column(Integer, nullable=True)     # e.g., 2026
    target_departments = Column(JSON, nullable=True)       # e.g., ["CSE", "ECE"]
    target_placement_status = Column(String, default="ALL")# ALL / UNPLACED_ONLY / PLACED_ONLY
    target_job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

---

## 6. Endpoints Blueprint

| Endpoint | Method | Allowed Roles | Description |
| :--- | :---: | :--- | :--- |
| `/api/notifications` | `GET` | All Roles | Lists user's notifications with unread count badge. |
| `/api/notifications/{id}/read` | `PATCH` | All Roles | Marks a single notification as read. |
| `/api/notifications/read-all` | `PATCH` | All Roles | Marks all notifications as read for current user. |
| `/api/broadcasts` | `POST` | `TPO_ADMIN`, `DEPT_COORDINATOR` | Creates a new targeted broadcast or urgent flash banner. |
| `/api/broadcasts/active` | `GET` | All Roles | Returns active flash banners and circulars targeted to the logged-in student. |
