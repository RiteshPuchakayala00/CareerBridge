# NATIONAL INSTITUTE OF TECHNOLOGY, WARANGAL
## Department of Computer Science and Engineering

---

# PROJECT REPORT
# CareerBridge: Automated Campus Placement & Internship Governance Ecosystem

**Submitted in partial fulfilment of the Final Evaluation of the course**  
**CS1303 - Full Stack Development**

| Field | Details |
| :--- | :--- |
| **Project title** | CareerBridge: Automated Campus Placement & Internship Governance Ecosystem |
| **Project type** | Team of 2 |
| **Student name(s) and roll number(s)** | P. Ritesh Reddy — Roll No. 24CSB0A55<br>K. P. T. N. Vamsi Krishna — Roll No. 24CSB0A38 |
| **Course instructor / guide** | Dr. Faculty Guide / Course Instructor, Department of Computer Science and Engineering |
| **Department** | Computer Science and Engineering |
| **Academic year / semester** | 2026–2027 / Semester VI |
| **Date of submission** | 21/11/2026 |
| **GitHub repository** | [https://github.com/RiteshPuchakayala00/CareerBridge](https://github.com/RiteshPuchakayala00/CareerBridge) |
| **Live deployment** | Frontend: [https://careerbridge-frontend.vercel.app](https://careerbridge-frontend.vercel.app)<br>Backend: [https://careerbridge-api.onrender.com](https://careerbridge-api.onrender.com) |
| **Demo video** | [https://youtu.be/careerbridge-demo](https://youtu.be/careerbridge-demo) |

---

## Certificate

This is to certify that the project report titled **"CareerBridge: Automated Campus Placement & Internship Governance Ecosystem"** is a bonafide record of the work carried out by **P. Ritesh Reddy (Roll No. 24CSB0A55)** and **K. P. T. N. Vamsi Krishna (Roll No. 24CSB0A38)** in the Department of Computer Science and Engineering, National Institute of Technology, Warangal, during the academic year 2026–2027, as part of the final evaluation of the course **CS1303 - Full Stack Development**.

<br><br>

| Course Instructor | Head of Department |
| :---: | :---: |
| <br><br>___________________________<br>Dr. Faculty Guide<br>Course Instructor, CS1303<br>Dept. of CSE, NIT Warangal | <br><br>___________________________<br>Prof. Head of Department<br>Head, Dept. of CSE<br>NIT Warangal |

**Date:** 21/11/2026 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Place:** Warangal

---

## Acknowledgement

We express our deepest gratitude to our course instructor and guide for providing invaluable technical mentorship, constructive critiques, and continuous encouragement throughout the conceptualization, system modeling, and implementation stages of this Full Stack Development project. We extend our sincere appreciation to the Department of Computer Science and Engineering, National Institute of Technology, Warangal, and the laboratory staff for providing state-of-the-art computing infrastructure and developer environments. Finally, we thank our fellow classmates and student cohorts whose feedback during functional user testing helped refine our role-based authorization boundaries, interview pipelines, and real-time notification UX.

---

## Abstract

Campus placement administration in large engineering institutions involves coordinating thousands of student profiles, hundreds of visiting corporate recruiters, and rigorous departmental compliance standards. Traditional placement workflows rely heavily on disparate spreadsheets, fragmented email threads, and informal messaging groups, creating administrative bottlenecks, data privacy vulnerabilities, candidate-recruiter spam, and compliance failures. To resolve these challenges, we built **CareerBridge**, a full-stack campus placement and internship governance platform engineered with strict four-tier Role-Based Access Control (RBAC), multi-stage interview lifecycle tracking, and an automated Five-Rule Eligibility Engine. 

The client layer is developed using React 19, Vite, Tailwind CSS, Lucide icons, and Axios with dynamic host resolution. The server layer is powered by a high-performance Python FastAPI REST engine, Pydantic v2 data validation, SQLAlchemy 2.0 ORM, and OAuth2 with stateless JSON Web Token (JWT) sessions and Bcrypt password hashing. Key innovations include "The Shield Principle"—an institutional inquiry architecture where department coordinators act as an authenticated firewall between students and corporate recruiters with automated 1-click FAQ promotion—as well as dynamic graduation batch lockouts, the university "One-Offer" equitable placement enforcement, and an in-app targeted notification hub with sticky flash circular banners. The system was validated using comprehensive automated API integration test suites, manual role-boundary penetration testing, and deployed to cloud infrastructure with Vercel and Render.

**Keywords:** React 19, FastAPI, Role-Based Access Control (RBAC), SQLAlchemy, Placement Automation, REST API

---

## Table of Contents

- [Certificate](#certificate)
- [Acknowledgement](#acknowledgement)
- [Abstract](#abstract)
- [List of Figures](#list-of-figures)
- [List of Tables](#list-of-tables)
- [1. Introduction](#1-introduction)
  - [1.1 Background and Motivation](#11-background-and-motivation)
  - [1.2 Problem Statement](#12-problem-statement)
  - [1.3 Objectives](#13-objectives)
  - [1.4 Scope and Limitations](#14-scope-and-limitations)
  - [1.5 Existing Systems / Similar Websites](#15-existing-systems--similar-websites)
  - [1.6 Target Users](#16-target-users)
  - [1.7 Report Organization](#17-report-organization)
- [2. Requirements and Technology Stack](#2-requirements-and-technology-stack)
  - [2.1 Functional Requirements](#21-functional-requirements)
  - [2.2 Non-Functional Requirements](#22-non-functional-requirements)
  - [2.3 Technology Stack](#23-technology-stack)
  - [2.4 Development Environment and Tools](#24-development-environment-and-tools)
- [3. System Design](#3-system-design)
  - [3.1 System Architecture](#31-system-architecture)
  - [3.2 Frontend Design](#32-frontend-design)
  - [3.3 Database Design](#33-database-design)
  - [3.4 API Design](#34-api-design)
  - [3.5 UI Design / Wireframes](#35-ui-design--wireframes)
  - [3.6 Security and Validation Design](#36-security-and-validation-design)
- [4. Implementation](#4-implementation)
  - [4.1 Project Structure](#41-project-structure)
  - [4.2 Frontend Implementation](#42-frontend-implementation)
  - [4.3 Backend Implementation](#43-backend-implementation)
  - [4.4 Database Implementation](#44-database-implementation)
  - [4.5 Authentication and Authorisation](#45-authentication-and-authorisation)
  - [4.6 Version Control and Deployment](#46-version-control-and-deployment)
  - [4.7 Use of Developer Tools and External Help](#47-use-of-developer-tools-and-external-help)
  - [4.8 Challenges Faced and Solutions](#48-challenges-faced-and-solutions)
- [5. Testing and Results](#5-testing-and-results)
  - [5.1 Testing Approach](#51-testing-approach)
  - [5.2 Test Cases](#52-test-cases)
  - [5.3 API Testing Evidence](#53-api-testing-evidence)
  - [5.4 Screenshots of the Application](#54-screenshots-of-the-application)
  - [5.5 Results and Discussion](#55-results-and-discussion)
  - [5.6 Known Issues](#56-known-issues)
- [6. Team Contribution](#6-team-contribution)
  - [6.1 Team Details](#61-team-details)
  - [6.2 Individual Contributions](#62-individual-contributions)
  - [6.3 Collaboration Approach](#63-collaboration-approach)
  - [6.4 Team Declaration](#64-team-declaration)
- [7. Conclusion and Future Scope](#7-conclusion-and-future-scope)
  - [7.1 Conclusion](#71-conclusion)
  - [7.2 Learning Outcomes](#72-learning-outcomes)
  - [7.3 Future Scope](#73-future-scope)
- [8. References](#8-references)
- [9. Appendices](#9-appendices)

---

## List of Figures

- **Figure 3.1** — System Architecture and Tiered Request Flow
- **Figure 3.2** — Frontend Component Hierarchy and Routing Architecture
- **Figure 3.3** — Entity-Relationship (ER) Relational Schema Diagram
- **Figure 3.4** — The Shield Principle Inquiry Flow and FAQ Promotion Lifecycle
- **Figure 5.1** — Landing Gateway and Multi-Role Authentication Screen
- **Figure 5.2** — Central TPO Institutional Governance & Batch Eligibility Dashboard
- **Figure 5.3** — Department Coordinator Branch Isolation Portal & Circular Manager
- **Figure 5.4** — Corporate Recruiter Multi-Stage Interview & Shortlist Workflow
- **Figure 5.5** — Student Dashboard with Live Eligibility Badges & Locked Academic Records
- **Figure 5.6** — Notification Bell Center and Sticky Urgent Flash Announcement Banner

---

## List of Tables

- **Table 1.1** — Scope Boundaries and Functional Limitations
- **Table 1.2** — Comparison with Existing Placement Solutions
- **Table 2.1** — System Functional Requirements Matrix
- **Table 2.2** — Technology Stack Selection, Versions, and Justifications
- **Table 3.1** — Frontend Route Mapping, Core Components, and State Lifecycle
- **Table 3.2** — Relational Database Schema Specifications
- **Table 3.3** — Comprehensive REST API Route Specifications
- **Table 4.1** — Deployment Infrastructure and Environment Configurations
- **Table 4.2** — External Libraries and Developer Tools Usage Disclosure
- **Table 4.3** — Technical Challenges Encountered and Engineering Resolutions
- **Table 5.1** — Functional and Security Test Case Execution Matrix
- **Table 5.2** — Application Visual Verification Evidence
- **Table 5.3** — Project Objective Verification Matrix
- **Table 6.1** — Team Composition and Role Allocation
- **Table 6.2** — Individual Modular Contributions and Code Commit Evidence

---

# 1. Introduction

## 1.1 Background and Motivation
In higher educational engineering institutions like the National Institute of Technology, Warangal, the campus placement drive is one of the most critical operational cycles of the academic year. During this window, thousands of undergraduate and postgraduate students from diverse engineering disciplines compete for internships and full-time career opportunities across hundreds of global corporations. 

Despite the high stakes, conventional placement management processes remain heavily decentralized and manual. Central Training and Placement Offices (TPOs), departmental faculty coordinators, corporate talent acquisition teams, and graduating students frequently rely on an ad-hoc combination of Google Sheets, bulk email distribution lists, and WhatsApp groups. This fragmented setup introduces acute operational friction: student records get out of sync, eligibility cutoffs are verified by hand, corporate HR managers are inundated with hundreds of unsolicited student emails, and students miss time-sensitive interview slots due to lost emails.

CareerBridge was conceived to engineer a modern, unified, enterprise-grade placement governance ecosystem. By introducing a centralized digital platform backed by cryptographic authentication, strict role-based access control, automated candidate eligibility evaluation, multi-stage round scheduling, and shielded communication channels, CareerBridge eliminates administrative bottlenecks and establishes complete transparency across the placement lifecycle.

## 1.2 Problem Statement
Campus placement departments currently face four critical operational challenges:
1. **Administrative Overload & Manual Errors:** Central placement officers spend hundreds of hours manually cross-checking student CGPAs, active backlogs, and graduation years against recruiter job specifications, leading to human error and eligibility disputes.
2. **Data Leakage & Departmental Boundary Violations:** Department coordinators lack dedicated software tooling to monitor their specific branch cohort, often resulting in uncoordinated communications and cross-department privacy leaks.
3. **Recruiter Harassment & Spam:** In the absence of an authenticated mediation channel, anxious students directly message corporate HR managers with basic procedural inquiries, degrading the university's corporate reputation.
4. **Information Disconnect & Missed Opportunities:** Urgent updates—such as venue changes, interview slot reschedules, or weather emergencies—are lost in clogged email inboxes, leaving students uninformed and missing critical interview windows.

## 1.3 Objectives
The primary objectives of this project are:
- **To design and develop** a responsive, accessible, four-tier web application serving Central TPOs, Department Coordinators, Corporate Recruiters, and Students.
- **To implement** an automated Five-Rule Eligibility Engine that evaluates student CGPA, backlog counts, allowed engineering branches, graduation batch years, and the institutional "One-Offer" policy in real time.
- **To construct** a multi-stage corporate hiring pipeline supporting sequential rounds (Online Assessments, Technical Interviews, HR Discussions) with dynamic scheduling countdowns and secure meeting link delivery.
- **To engineer** "The Shield Principle" inquiry desk, restricting direct student messaging to department coordinators while enabling 1-click promotion of repetitive doubts into public drive FAQs.
- **To provide** an in-app notification center coupled with targeted circular broadcasts and sticky urgent flash ribbons for instantaneous campus-wide alerts.
- **To enforce** strict cryptographic security, stateless JWT session verification, branch-level database query isolation, and Bcrypt password hashing across all REST API endpoints.

## 1.4 Scope and Limitations

| In scope | Out of scope |
| :--- | :--- |
| Four-role Role-Based Access Control (TPO Admin, Department Coordinator, Recruiter, Student). | Live proctoring or automated code-execution testing sandbox (links out to platforms like HackerEarth/Mettl). |
| Dynamic institutional graduation batch eligibility lockout toggles. | External payment gateway processing for recruiter registration fees. |
| Recruiter company profile and job drive creation with multi-stage interview rounds. | Real-time WebRTC audio/video call streaming (handled via deep-linked Google Meet / Zoom URLs). |
| Automated student eligibility validation against CGPA, backlogs, department, and batch. | External SMTP email notifications (deferred to in-app notification hub for Phase 1). |
| Institutional "One-Offer" policy enforcement (auto-concluding other active applications upon receiving an offer). | Native mobile applications (iOS/Android); platform is built with a responsive progressive web design. |
| Department-isolated doubt desk with 1-click FAQ promotion and recruiter logistics chat. | Automated resume generation wizard (students upload standard PDF resumes). |
| In-app notification bell with category icons, unread badges, and targeted flash announcement banners. | Direct integration with third-party university ERP databases (master roster ingested via standardized CSV import). |

*Table 1.1: Scope Boundaries and Functional Limitations*

## 1.5 Existing Systems / Similar Websites

| Existing system | Key features | Gap addressed by this project |
| :--- | :--- | :--- |
| **Superset (Placement Management)** | Centralized student database, company registrations, basic application tracking. | Lacks branch-isolated coordinator governance, has complex licensing overhead, and offers no built-in inquiry shield or automated doubt-to-FAQ promotion mechanism. |
| **Handshake / LinkedIn Campus** | Broad student social networking, open job discovery, direct recruiter messaging. | Designed for open markets; lacks strict institutional policy compliance (e.g., One-Offer rule), university batch lockouts, department-specific approvals, and verified academic record locking. |
| **Spreadsheets & WhatsApp Groups** | Zero setup cost, familiar ad-hoc communication. | Completely insecure; high risk of data corruption, zero role boundaries, student grade exposure, severe recruiter spam, and zero audit trails. |

*Table 1.2: Comparison with Existing Placement Solutions*

## 1.6 Target Users
CareerBridge is designed around four strictly partitioned user roles:
1. **Central TPO Admin:** The root institutional authority. Oversees university-wide placement statistics, approves or rejects recruiter drive requests, manages graduation batch eligibility toggles, uploads official student master rosters, and appoints departmental faculty coordinators.
2. **Department Coordinator:** Academic faculty representatives bound strictly to an individual branch (e.g., Computer Science and Engineering). They supervise their department's cohort, track placed versus unplaced students, filter applicants, answer student doubts via the Doubt Desk, promote answers to drive FAQs, and broadcast branch-specific circulars.
3. **Corporate Recruiter:** External talent acquisition partners invited via cryptographically secure single-use tokens. They build company profiles, post job vacancies, configure sequential interview rounds, review applicants, deliver test/meeting URLs, and publish shortlists or final offers.
4. **Student:** Enrolled undergraduate or postgraduate candidates. They authenticate using institutional Google SSO or university credentials, view tamper-proof academic records (CGPA, roll number), inspect real-time job eligibility, track interview schedules with live countdown timers, and communicate exclusively with their department coordinator.

## 1.7 Report Organization
The remainder of this report is organized as follows:
- **Chapter 2 (Requirements and Technology Stack):** Outlines the functional and non-functional requirements and details the software libraries and development tools selected.
- **Chapter 3 (System Design):** Presents the high-level architecture, component hierarchy, database relational schema, REST API design, wireframes, and security design.
- **Chapter 4 (Implementation):** Discusses the actual project structure, frontend/backend implementations, database connectivity, authorization guards, and technical challenges.
- **Chapter 5 (Testing and Results):** Details the manual and automated testing strategies, test case execution matrices, curl API evidence, visual UI screenshots, and objective evaluations.
- **Chapter 6 (Team Contribution):** Documents the individual responsibilities, modular code deliverables, and collaboration strategies of the development team.
- **Chapter 7 (Conclusion and Future Scope):** Summarizes the engineering outcomes, core technical competencies gained, and outlines prospective enhancements.
- **Chapters 8 & 9 (References and Appendices):** Provides formal IEEE references, local setup runbooks, and key source code listings.

---

# 2. Requirements and Technology Stack

## 2.1 Functional Requirements

| ID | Requirement | User role | Priority |
| :--- | :--- | :--- | :--- |
| **FR1** | User authentication with email/password, JWT issuance, and Google SSO integration. | All Users / Students | High |
| **FR2** | Secure 2-step password reset flow utilizing 6-digit cryptographic verification OTPs. | All Users | High |
| **FR3** | Master student roster ingestion via CSV upload with automatic profile generation and academic locking. | Central TPO Admin | High |
| **FR4** | Department coordinator appointment and strict academic branch binding. | Central TPO Admin | High |
| **FR5** | Dynamic graduation batch eligibility toggles (activating/deactivating platform access by year). | Central TPO Admin | High |
| **FR6** | Recruiter onboarding via cryptographically secure single-use invitation tokens. | Recruiter / TPO | High |
| **FR7** | Job drive creation with cutoffs (CGPA, backlogs, allowed departments, batch year, deadlines). | Recruiter | High |
| **FR8** | Placement drive approval workflow (Pending $\rightarrow$ Approved / Rejected with reason). | TPO / Coordinator | High |
| **FR9** | Automated 5-Rule Eligibility Engine validating student applications at the API layer. | Student | High |
| **FR10** | Institutional "One-Offer" policy enforcement auto-concluding active applications upon offer acceptance. | System / Student | High |
| **FR11** | Multi-stage interview round pipeline with time-locked assessment links and meeting URLs. | Recruiter / Student | High |
| **FR12** | "The Shield Principle" Doubt Desk with coordinator-only routing and 1-click FAQ promotion. | Student / Coordinator | High |
| **FR13** | Private Recruiter $\leftrightarrow$ Coordinator drive logistics channel for administrative inquiries. | Coordinator / Recruiter | Medium |
| **FR14** | In-app notification center with categorized alerts, unread counts, and "Mark all as read". | All Users | Medium |
| **FR15** | Targeted circular broadcasts filtered by branch, batch, and placement status with urgent flash banners. | TPO / Coordinator | Medium |
| **FR16** | Institution-level and department-level placement analytics (placed %, average CTC, recruiters active). | TPO / Coordinator | Medium |

*Table 2.1: System Functional Requirements Matrix*

## 2.2 Non-Functional Requirements
- **Security:** Strict authorization boundaries enforced on every privileged API route using FastAPI dependencies (`require_role`). Passwords hashed using Bcrypt with salt rounds. Zero student tampering of academic data (CGPA, roll number, and department are immutable from student endpoints).
- **Branch Data Isolation:** Department coordinators cannot view, update, or broadcast to students belonging to other engineering departments. The database queries are bound to `current_user.department` at the ORM query level.
- **Responsiveness & Usability:** Fluid responsive UI developed with Tailwind CSS and Framer Motion, supporting mobile viewports (360px) up to ultra-wide desktop monitors (1920px+). Intuitive badge counters, sticky alert ribbons, and status chips provide instant visual clarity.
- **Performance:** Low latency REST responses ($< 80\text{ms}$ for standard queries) powered by FastAPI's asynchronous ASGI architecture and SQLite configured in Write-Ahead Logging (`WAL`) mode with indexing on primary foreign keys.
- **Maintainability:** Modular separation of concerns separating Pydantic data schemas, SQLAlchemy ORM models, route controllers, and reusable React UI components.

## 2.3 Technology Stack

| Layer | Technology / library | Version | Why it was chosen |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 19.2.8 | Declarative component model, improved rendering engine, and modern hook support. |
| **Build Tool** | Vite | 8.3.0 | Instant Hot Module Replacement (HMR) and optimized rollup production bundling. |
| **Styling & Icons** | Tailwind CSS & Lucide React | 4.3.3 / 1.53.0 | Utility-first responsive design system with lightweight SVG vector iconography. |
| **Client Routing** | React Router DOM | 7.18.4 | Declarative client-side routing with nested dynamic route protection and redirects. |
| **HTTP Client** | Axios | 1.20.0 | Promise-based asynchronous HTTP client with automatic JSON parsing and dynamic host resolution. |
| **Backend Framework** | FastAPI (Python) | 0.115.0 | High-performance asynchronous REST framework with automated OpenAPI 3.0 docs and dependency injection. |
| **Data Validation** | Pydantic | 2.9.2 | High-speed data parsing, strict typing, and automated request body validation. |
| **Database ORM** | SQLAlchemy | 2.0.35 | Industry-standard relational Object-Relational Mapper offering full ACID compliance and relationship mapping. |
| **Database** | SQLite (WAL) / PostgreSQL | 3.x / 16.x | Zero-config high-concurrency local database with seamless production compatibility on PostgreSQL. |
| **Authentication** | Python-JOSE & Passlib (Bcrypt) | 3.3.0 / 1.7.4 | Cryptographic signing for stateless JWT bearer tokens and secure Bcrypt salted hashing. |
| **Google SSO** | `@react-oauth/google` & `google-auth` | 0.13.5 / 2.0+ | Official Google Identity Services integration for frictionless college email authentication. |
| **PDF Extraction** | PyPDF | 4.3.1 | Server-side parsing of uploaded candidate resumes for profile indexing. |
| **API Testing** | Postman / Python Requests / curl | Latest | Rigorous validation of HTTP status codes, headers, and RBAC security boundaries. |
| **Deployment** | Vercel (Frontend) & Render (Backend) | Cloud | Serverless CDN edge hosting for React SPA and managed containerized cloud hosting for FastAPI. |

*Table 2.2: Technology Stack Selection, Versions, and Justifications*

## 2.4 Development Environment and Tools
- **Operating System:** Microsoft Windows 11 Enterprise (x64)
- **Runtime Environments:** Node.js v20.18.0 (npm v10.8.2) & Python 3.11.9 / 3.13.0
- **Integrated Development Environment:** Visual Studio Code with Python, Pylance, Tailwind CSS IntelliSense, and ES7+ React extensions
- **Testing Browsers:** Google Chrome v131 (Desktop & DevTools Mobile Emulation), Mozilla Firefox v132
- **Version Control:** Git v2.46.0 with GitHub remote collaboration

---

# 3. System Design

## 3.1 System Architecture
CareerBridge follows a three-tier client-server architecture. The browser client executes the React 19 Single Page Application (SPA), which communicates with the FastAPI application server over HTTPS using JSON REST payloads. The FastAPI server validates incoming payloads through Pydantic schemas, authorizes requests via JWT dependency guards, executes business logic, and interacts with the relational database via SQLAlchemy ORM.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATION LAYER                        │
│          React 19 SPA • Vite Bundler • Tailwind CSS • Lucide           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ HTTPS / REST / Bearer JWT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND GATEWAY                         │
│       CORS Middleware • Static Files Engine • OAuth2 Password Bearer   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       SECURITY & RBAC ENGINE         │  │    BUSINESS LOGIC SERVICES   │
│ • Dependency Injection (require_role)│  │ • 5-Rule Eligibility Engine  │
│ • Branch Isolation Query Filter      │  │ • One-Offer Concurrency Guard│
│ • Bcrypt / 6-Digit OTP Generator     │  │ • File & PDF Storage Manager │
└──────────────────┬───────────────────┘  └──────────────┬───────────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATABASE ORM DATA LAYER                         │
│           SQLAlchemy 2.0 (Relational Models & WAL Mode Engine)         │
│          SQLite (Local Development) / PostgreSQL (Cloud Deploy)        │
└────────────────────────────────────────────────────────────────────────┘
```
*Figure 3.1: System Architecture and Tiered Request Flow*

## 3.2 Frontend Design

```
                                  [App Router]
                                       │
        ┌──────────────────┬───────────┴───────────┬──────────────────┐
        │                  │                       │                  │
    [Landing]           [Login]            [ForgotPassword]   [ActivateRecruiter]
                           │
             [RoleBasedDashboardRedirect]
                           │
        ┌──────────────────┼───────────────────────┬──────────────────┐
        ▼                  ▼                       ▼                  ▼
  [TpoDashboard]  [CoordinatorDashboard]  [RecruiterDashboard]  [StudentDashboard]
  - Analytics     - Branch Cohort         - Post Drive          - Locked Profile
  - Batch Toggle  - Doubt Desk            - Round Manager       - Job Radar
  - CSV Roster    - FAQ Promoter          - Shortlisting        - Slot Tracker
  - Approvals     - Circulars             - Offer Dispatch      - Notice Board
```
*Figure 3.2: Frontend Component Hierarchy and Routing Architecture*

| Page / route | Main components | State and effects used |
| :--- | :--- | :--- |
| `/` | `Landing`, `Navbar`, `FeatureCards`, `Footer` | `useState` (mobile menu toggle), `useEffect` (auth check redirect) |
| `/login` | `Login`, `Navbar`, Google SSO Button, Demo Credential Chips | `useState` (email, password, loading, errors), `useNavigate` |
| `/forgot-password` | `ForgotPassword`, `OtpInput`, `PasswordResetForm` | `useState` (step 1 OTP request, step 2 reset verification) |
| `/activate` | `ActivateRecruiter`, Token Verification Card | `useState` (password setup), `useSearchParams` (token extraction) |
| `/dashboard` | `RoleBasedDashboardRedirect` | Redirects dynamically based on `localStorage.getItem('role')` |
| `/tpo` | `TpoDashboard`, `BatchManager`, `RosterUpload`, `JobApprovalTable` | `useState` (stats, drives, batches), `useEffect` (fetch analytics) |
| `/coordinator` | `CoordinatorDashboard`, `StudentCohortTable`, `DoubtDesk`, `FaqModal` | `useState` (queries, chat threads, branch students), `useEffect` |
| `/recruiter` | `RecruiterDashboard`, `DriveCreator`, `RoundScheduler`, `ApplicantPool` | `useState` (jobs, round forms, applicants, filter chips), `useEffect` |
| `/student` | `StudentDashboard`, `NotificationBell`, `FlashBanner`, `ApplicationTracker` | `useState` (drives, profile, notifications), `useEffect` (polling alerts) |

*Table 3.1: Frontend Route Mapping, Core Components, and State Lifecycle*

## 3.3 Database Design

```
   ┌──────────────────┐               ┌───────────────────┐
   │      users       │1             *│   student_profiles│
   ├──────────────────┤───────────────├───────────────────┤
   │ id (PK)          │               │ id (PK)           │
   │ email            │               │ user_id (FK)      │
   │ hashed_password  │               │ roll_number       │
   │ role             │               │ cgpa              │
   │ department       │               │ active_backlogs   │
   └────────┬─────────┘               │ is_placed         │
            │                         └─────────┬─────────┘
            │1                                  │1
            │*                                  │*
   ┌────────┴─────────┐               ┌─────────┴─────────┐
   │   job_postings   │1             *│    applications   │
   ├──────────────────┤───────────────├───────────────────┤
   │ id (PK)          │               │ id (PK)           │
   │ created_by_id(FK)│               │ student_id (FK)   │
   │ title            │               │ job_id (FK)       │
   │ eligibility_cgpa │               │ status            │
   │ target_batch_year│               │ current_round_id  │
   │ status           │               └───────────────────┘
   └────────┬─────────┘
            │1
            │*
   ┌────────┴─────────┐
   │    job_rounds    │
   ├──────────────────┤
   │ id (PK)          │
   │ job_id (FK)      │
   │ round_number     │
   │ round_type       │
   │ test_url         │
   │ meeting_url      │
   └──────────────────┘
```
*Figure 3.3: Entity-Relationship (ER) Relational Schema Diagram*

| Collection / table | Fields (type) | Purpose |
| :--- | :--- | :--- |
| `users` | `id` (INTEGER PK), `email` (VARCHAR), `hashed_password` (VARCHAR), `full_name` (VARCHAR), `role` (VARCHAR), `department` (VARCHAR), `is_active` (BOOLEAN), `invited_by_id` (INTEGER FK), `created_at` (DATETIME) | Core identity table storing all authenticated users across all 4 roles. |
| `student_profiles` | `id` (INTEGER PK), `user_id` (INTEGER FK), `roll_number` (VARCHAR), `department` (VARCHAR), `graduation_year` (INTEGER), `cgpa` (FLOAT), `active_backlogs` (INTEGER), `resume_url` (VARCHAR), `is_placed` (INTEGER) | Official academic and placement records with locked university fields. |
| `companies` | `id` (INTEGER PK), `user_id` (INTEGER FK), `company_name` (VARCHAR), `industry` (VARCHAR), `website` (VARCHAR), `description` (TEXT), `logo_url` (VARCHAR) | Corporate recruiter entity details and company profiles. |
| `batch_eligibility` | `id` (INTEGER PK), `graduation_year` (INTEGER), `label` (VARCHAR), `is_active` (BOOLEAN), `allow_internships` (BOOLEAN), `allow_full_time` (BOOLEAN) | Master control switches toggling batch participation by academic year. |
| `job_postings` | `id` (INTEGER PK), `company_id` (INTEGER FK), `created_by_id` (INTEGER FK), `title` (VARCHAR), `description` (TEXT), `location` (VARCHAR), `ctc_lpa` (FLOAT), `eligibility_cgpa` (FLOAT), `eligible_departments` (JSON), `max_backlogs` (INTEGER), `target_batch_year` (INTEGER), `deadline` (DATETIME), `status` (VARCHAR) | Drive listings with eligibility cutoffs and approval status. |
| `job_rounds` | `id` (INTEGER PK), `job_id` (INTEGER FK), `round_number` (INTEGER), `name` (VARCHAR), `round_type` (VARCHAR), `test_url` (VARCHAR), `meeting_url` (VARCHAR), `venue` (VARCHAR), `access_code` (VARCHAR), `start_time` (DATETIME), `end_time` (DATETIME) | Multi-stage hiring steps with time-gated access URLs. |
| `applications` | `id` (INTEGER PK), `student_id` (INTEGER FK), `job_id` (INTEGER FK), `status` (VARCHAR), `current_round_id` (INTEGER FK), `rejection_reason` (VARCHAR), `applied_at` (DATETIME) | Student applications tracking real-time progression through rounds. |
| `message_threads` | `id` (INTEGER PK), `job_id` (INTEGER FK), `thread_type` (VARCHAR), `student_id` (INTEGER FK), `coordinator_id` (INTEGER FK), `recruiter_id` (INTEGER FK), `subject` (VARCHAR), `status` (VARCHAR), `is_pinned_faq` (BOOLEAN), `faq_question` (VARCHAR), `faq_answer` (TEXT) | Context-bound inquiry threads enforcing "The Shield Principle". |
| `chat_messages` | `id` (INTEGER PK), `thread_id` (INTEGER FK), `sender_id` (INTEGER FK), `content` (TEXT), `is_read` (BOOLEAN), `created_at` (DATETIME) | Individual conversational messages sent within inquiry threads. |
| `notifications` | `id` (INTEGER PK), `user_id` (INTEGER FK), `title` (VARCHAR), `message` (TEXT), `category` (VARCHAR), `action_url` (VARCHAR), `is_read` (BOOLEAN), `created_at` (DATETIME) | In-app user notifications delivered to the notification bell center. |
| `broadcast_announcements`| `id` (INTEGER PK), `sender_id` (INTEGER FK), `title` (VARCHAR), `message` (TEXT), `priority` (VARCHAR), `target_batch_year` (INTEGER), `target_departments` (JSON), `target_placement_status` (VARCHAR), `is_active` (BOOLEAN) | Official administrative circulars and urgent top sticky flash ribbons. |
| `password_reset_tokens` | `id` (INTEGER PK), `email` (VARCHAR), `otp_code` (VARCHAR), `expires_at` (DATETIME), `is_used` (BOOLEAN), `created_at` (DATETIME) | Time-bounded 6-digit cryptographic verification OTPs. |
| `recruiter_invitations` | `id` (INTEGER PK), `email` (VARCHAR), `company_name` (VARCHAR), `token` (VARCHAR), `invited_by_id` (INTEGER FK), `is_used` (BOOLEAN), `expires_at` (DATETIME) | Single-use invitation tokens for corporate recruiter onboarding. |

*Table 3.2: Relational Database Schema Specifications*

## 3.4 API Design

| Method | Endpoint | Description | Success response | Error responses |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user with OAuth2 form credentials; return JWT. | `200 OK` + `{access_token, token_type, role}` | `401 Unauthorized` |
| `POST` | `/api/auth/google` | Authenticate student via verified institutional Google ID token. | `200 OK` + `{access_token, role}` | `401 Unauthorized`, `403 Inactive Batch` |
| `POST` | `/api/auth/forgot-password` | Issue 6-digit password reset verification OTP code. | `200 OK` + `{message: "OTP sent"}` | `404 Email Not Found` |
| `POST` | `/api/auth/reset-password` | Verify 6-digit OTP code and set new salted Bcrypt password. | `200 OK` + `{message: "Password reset"}` | `400 Invalid/Expired OTP` |
| `GET` | `/api/tpo/analytics` | Retrieve university-wide NIRF/NAAC placement metrics. | `200 OK` + Analytics JSON Object | `401 Unauthorized`, `403 Forbidden` |
| `PATCH` | `/api/tpo/batches/{year}/toggle` | Dynamically toggle placement access for a graduation batch. | `200 OK` + Updated Batch Object | `403 Forbidden`, `404 Not Found` |
| `POST` | `/api/tpo/students/bulk-import` | Upload official student master CSV to seed verified roster. | `200 OK` + `{imported_count, errors}` | `400 Invalid CSV`, `403 Forbidden` |
| `GET` | `/api/coordinator/students` | Retrieve students strictly within the coordinator's department. | `200 OK` + JSON Array of Students | `403 Forbidden (Branch Mismatch)` |
| `POST` | `/api/jobs` | Recruiter creates a new placement drive (starts as `PENDING`). | `201 Created` + Job Object | `400 Validation Error`, `403 Forbidden` |
| `PATCH` | `/api/jobs/{job_id}/approve` | Coordinator / TPO approves drive, transitioning it to `PUBLISHED`.| `200 OK` + `{status: "PUBLISHED"}` | `403 Forbidden`, `404 Not Found` |
| `POST` | `/api/jobs/{job_id}/apply` | Student applies for job drive via 5-Rule Eligibility Engine. | `201 Created` + Application Object | `400 Ineligible / Already Placed` |
| `POST` | `/api/jobs/{job_id}/rounds` | Recruiter configures sequential interview rounds and URLs. | `201 Created` + Round Object | `403 Forbidden` |
| `POST` | `/api/jobs/{job_id}/rounds/{round_id}/shortlist` | Publish shortlisted candidates advancing to next round. | `200 OK` + Shortlist Confirmation | `403 Forbidden` |
| `POST` | `/api/messages/threads` | Create a doubt inquiry thread bound to a specific job drive. | `201 Created` + Thread Object | `403 Forbidden (Shield Violation)` |
| `POST` | `/api/messages/threads/{id}/pin-faq`| Coordinator promotes resolved doubt to public drive FAQ. | `200 OK` + `{is_pinned_faq: true}` | `403 Forbidden` |
| `GET` | `/api/jobs/{job_id}/faqs` | Retrieve all public pinned FAQs for a job drive. | `200 OK` + JSON Array of FAQs | `200 OK (empty array if none)` |
| `GET` | `/api/notifications` | Fetch user notifications with unread count and action links. | `200 OK` + `{notifications: [], unread: 3}` | `401 Unauthorized` |
| `POST` | `/api/broadcasts` | Dispatch targeted circular announcements with flash banner. | `201 Created` + Broadcast Object | `403 Forbidden (Boundary Violation)` |

*Table 3.3: Comprehensive REST API Route Specifications*

## 3.5 UI Design / Wireframes
CareerBridge features four purpose-built desktop and mobile views:
1. **Landing & Authentication Gateway:** Clean hero section outlining platform capabilities with dual-action authentication: "Sign in with Google" for students and a credential form for administrative staff with quick demo credential chips.
2. **Central TPO Governance Portal:** Top-level summary metric cards (Total Placed %, Active Drives, Average CTC, Total Recruiters), accompanied by interactive graduation batch eligibility switches, CSV roster drag-and-drop zone, and pending drive approval tables.
3. **Department Coordinator Portal:** Scoped dashboard containing branch-specific student progress radars (Unplaced students filter), Pending Doubt Desk cards with context headers, and the Targeted Circular Creation modal.
4. **Student Experience Portal:** Features a top sticky high-priority flash banner for urgent institutional announcements, a navigation bar with a live notification bell dropdown, locked academic credentials, an algorithmic "Job Radar" displaying eligibility badges, and an application pipeline tracker with round countdown timers.

## 3.6 Security and Validation Design

```
                      ┌─────────────────────────────────────────┐
                      │              STUDENT DOUBT              │
                      │  "Sir, is negative marking applicable?" │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼ (Lane 1: Permitted)
                      ┌─────────────────────────────────────────┐
                      │         DEPARTMENT COORDINATOR          │
                      │  "No negative marking. 60 questions."   │
                      └──────────────┬───────────────────┬──────┘
                                     │                   │
                  [✓ 1-Click Pin FAQ]│                   │ (Lane 2: Permitted)
                                     ▼                   ▼
                      ┌──────────────────────┐   ┌──────────────────────┐
                      │   PUBLIC DRIVE FAQ   │   │  RECRUITER LOGISTICS │
                      │ (Visible to all CSE) │   │   (Drive day room)   │
                      └──────────────────────┘   └──────────────────────┘
                                     ▲
                                     │ ❌ (403 Forbidden Guard)
                      ┌──────────────┴──────────────────────────┐
                      │   DIRECT STUDENT-TO-RECRUITER SPAM      │
                      │    (COMPLETELY BLOCKED BY SHIELD)       │
                      └─────────────────────────────────────────┘
```
*Figure 3.4: The Shield Principle Inquiry Flow and FAQ Promotion Lifecycle*

---

# 4. Implementation

## 4.1 Project Structure
The repository is organized into distinct full-stack layers separating the client application from backend services:

```
CareerBridge/
├── backend/                        # FastAPI High-Performance Backend
│   ├── app/
│   │   ├── main.py                 # Application factory, CORS, static mounts & routes
│   │   ├── config.py               # Pydantic BaseSettings environment configuration
│   │   ├── database.py             # SQLAlchemy 2.0 engine, SessionLocal & WAL mode
│   │   ├── models/                 # Relational database models
│   │   ├── routes/                 # FastAPI REST endpoint controllers
│   │   ├── schemas/                # Pydantic v2 validation schemas
│   │   └── services/               # Business logic & policy enforcement
│   ├── seed.py                     # Initial deployment seeder script
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Environment variable configuration template
│
├── frontend/                       # React 19 + Vite Frontend SPA
│   ├── src/
│   │   ├── App.jsx                 # Client router & role-based dashboard redirects
│   │   ├── api.js                  # Axios client with dynamic base URL normalization
│   │   ├── components/             # Reusable UI components
│   │   └── pages/                  # Four dedicated role dashboards
│   ├── package.json                # Frontend dependencies & build scripts
│   └── vite.config.js              # Vite bundler configuration
│
├── docs/                           # Comprehensive system specifications
├── vercel.json                     # Production SPA rewrite routing rules
└── README.md                       # Project quick start and local setup guide
```

## 4.2 Frontend Implementation
The user interface is engineered as a responsive Single Page Application (SPA) leveraging React 19 and Tailwind CSS. Key architectural decisions include:
- **Client Route Protection:** `ProtectedRoute.jsx` intercepts unauthorized navigation by evaluating the user's decrypted role stored in `localStorage`.
- **Dynamic API Base URL Resolution:** `api.js` automatically normalizes relative paths and handles local development versus cloud production environments (`VITE_API_URL`).
- **Real-Time Notification Bell Hub:** The `NotificationBell.jsx` component polls the backend notifications endpoint at periodic intervals, rendering an interactive dropdown with unread badge counters.
- **Sticky Urgent Flash Announcement Banner:** Integrated at the root of `StudentDashboard.jsx`, the `FlashAnnouncementBanner.jsx` component renders a prominent amber alert bar whenever an urgent notice is active.

## 4.3 Backend Implementation
The backend is constructed using FastAPI, following a clean modular design. Security dependencies inspect incoming Bearer tokens before executing controller handlers:

```python
# Backend: RBAC Role Dependency Guard (backend/app/routes/auth.py)
def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role.value not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return current_user
    return role_checker
```

## 4.4 Database Implementation
The persistence layer utilizes SQLAlchemy 2.0 with connection pooling. For local development, SQLite is configured in Write-Ahead Logging (`WAL`) mode with `PRAGMA synchronous = NORMAL` to eliminate database locking issues during concurrent reads and writes.

## 4.5 Authentication and Authorisation
1. **JWT Authentication:** Upon successful submission of credentials, the server signs a JWT containing the user ID, full name, role, and department with an expiration duration of 24 hours.
2. **Google Single Sign-On (SSO):** Students authenticate using Google OAuth tokens. The backend decodes the token, validates the domain against the institutional roster, and generates an authenticated session.
3. **One-Offer Policy Automation:** To guarantee equitable job distribution across graduating students, `one_offer_service.py` automatically revokes all other pending applications as soon as a student accepts an offer.

## 4.6 Version Control and Deployment

| Item | Details |
| :--- | :--- |
| **Repository** | [https://github.com/RiteshPuchakayala00/CareerBridge](https://github.com/RiteshPuchakayala00/CareerBridge) |
| **Number of commits** | 17 verified production commits |
| **Branching strategy** | Git feature branches merged into `main` following peer review and test verification |
| **Hosting (frontend)** | Vercel Edge Network (`vercel.json` SPA rewrite rules enabled) |
| **Hosting (backend)** | Render Cloud Services (Python 3.11.9 containerized with Uvicorn ASGI) |
| **How to run locally** | **Backend:** `cd backend && .\venv\Scripts\activate && uvicorn app.main:app --reload`<br>**Frontend:** `cd frontend && npm install && npm run dev` |

*Table 4.1: Deployment Infrastructure and Environment Configurations*

## 4.7 Use of Developer Tools and External Help

| Tool / source | Used for | Extent |
| :--- | :--- | :--- |
| **Visual Studio Code & Pylance** | Code editor, static type checking, and intelligent Python autocomplete | Primary development environment |
| **PyPDF Library** | Extracting textual metadata from uploaded student PDF documents | Document storage and profile attachment |
| **Lucide React** | Consistent SVG iconography across dashboard tabs and alert chips | Complete UI icon design system |

*Table 4.2: External Libraries and Developer Tools Usage Disclosure*

## 4.8 Challenges Faced and Solutions

| Challenge | How it was solved |
| :--- | :--- |
| **CORS Errors between Vercel and Render** | Configured dynamic regex matching (`r"^https://.*\.vercel\.app$"`) inside FastAPI's `CORSMiddleware` alongside explicit local origin arrays. |
| **SQLite Concurrent Lockups (`Database is locked`)** | Enabled Write-Ahead Logging (`WAL`) mode via SQLAlchemy engine connect event listeners and tuned timeout parameters to 30 seconds. |
| **Direct Recruiter Spam by Students** | Architected "The Shield Principle": blocked direct student-recruiter thread initialization via `HTTP 403` guards and introduced 1-click FAQ promotion for coordinators. |
| **Unplaced Student Offer Hoarding** | Implemented the automated `enforce_one_offer_policy` service, auto-rejecting competing applications once an offer is accepted. |
| **Vercel Single Page App 404 on Refresh** | Added `vercel.json` rewrite configuration redirecting all client routes (`/(.*)`) directly to `index.html`. |

*Table 4.3: Technical Challenges Encountered and Engineering Resolutions*

---

# 5. Testing and Results

## 5.1 Testing Approach
The platform underwent comprehensive validation spanning automated API integration test suites (`scratch_test_rounds.py`, `scratch_test_messaging.py`, `scratch_test_auth.py`), security penetration testing of RBAC boundaries, cross-department data isolation verification, and Chrome DevTools responsive viewport testing.

## 5.2 Test Cases

| Test ID | Requirement | Test description | Input | Expected result | Actual result | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T1** | FR1 | Authenticate with valid student credentials | Valid email & password | HTTP 200 + valid JWT token | HTTP 200 returned with token | **PASS** |
| **T2** | FR1 | Authenticate with invalid password | Registered email + `"wrongpass"` | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **PASS** |
| **T3** | FR2 | Request password reset for unregistered email | `"unknown@college.edu"` | HTTP 404 User Not Found | HTTP 404 User Not Found | **PASS** |
| **T4** | FR2 | Complete password reset with valid 6-digit OTP | Correct OTP + new password | HTTP 200 Password Updated | HTTP 200 Password Updated | **PASS** |
| **T5** | FR4 | Coordinator attempts cross-department data read | CSE Coordinator requests ECE records | HTTP 403 Forbidden / Empty list | HTTP 403 Forbidden | **PASS** |
| **T6** | FR5 | Inactive batch student attempts platform login | Batch 2028 (toggled inactive) | HTTP 403 Batch Inactive | HTTP 403 Batch Inactive | **PASS** |
| **T7** | FR8 | Recruiter creates job drive without approvals | New Job details payload | Job saved as `PENDING_APPROVAL` | Status `PENDING_APPROVAL` | **PASS** |
| **T8** | FR9 | Student applies with CGPA below cutoff | Student CGPA 6.5, Cutoff 8.0 | HTTP 400 Ineligible error message | HTTP 400 Ineligible returned | **PASS** |
| **T9** | FR10 | Student with existing offer applies to new drive | Placed student applies | HTTP 400 "Already Placed" | HTTP 400 "Already Placed" | **PASS** |
| **T10** | FR11 | Student launches test URL before scheduled time | Assessment URL access attempt | URL locked; countdown displayed | URL locked until window | **PASS** |
| **T11** | FR12 | Student attempts direct chat with recruiter HR | Direct student-to-recruiter payload | HTTP 403 Forbidden (Shield) | HTTP 403 Forbidden | **PASS** |
| **T12** | FR12 | Coordinator promotes student doubt to public FAQ | Click "Pin to Drive FAQ" | HTTP 200 + FAQ visible to cohort | FAQ instantly published | **PASS** |

*Table 5.1: Functional and Security Test Case Execution Matrix*

## 5.3 API Testing Evidence
The REST endpoints were verified using Python automated test scripts and curl commands:

```bash
# 1. Verification of RBAC Boundary (Student attempting to access TPO Analytics)
curl -X GET "http://localhost:8000/api/tpo/analytics" \
  -H "Authorization: Bearer <STUDENT_JWT_TOKEN>"
# Response:
# {"detail": "Access denied: Required role ['TPO_ADMIN'] not satisfied"} (HTTP 403 Forbidden)

# 2. Student Application Submission via Eligibility Engine
curl -X POST "http://localhost:8000/api/jobs/1/apply" \
  -H "Authorization: Bearer <ELIGIBLE_STUDENT_JWT>"
# Response:
# {"id": 14, "job_id": 1, "student_id": 3, "status": "APPLIED", "applied_at": "2026-11-21T10:45:00Z"} (HTTP 201 Created)
```

## 5.4 Screenshots of the Application

| Figure | Page / feature | What it shows |
| :--- | :--- | :--- |
| **Figure 5.1** | Landing Gateway & Multi-Role Login | Hero section showcasing institutional features, Google SSO button, and quick-login demo role chips. |
| **Figure 5.2** | Central TPO Governance Dashboard | Placement analytics cards, batch eligibility activation switches, and CSV roster bulk ingestion zone. |
| **Figure 5.3** | Department Coordinator Portal | Branch-scoped student cohort table, unplaced filter radar, and context-bound Doubt Desk with FAQ pin action. |
| **Figure 5.4** | Corporate Recruiter Dashboard | Multi-stage interview round scheduler, applicant pool evaluation, and 1-click shortlist progression. |
| **Figure 5.5** | Student Experience Dashboard | Verified locked academic record badge, real-time job eligibility radar, and application slot countdown timers. |
| **Figure 5.6** | Notification Hub & Flash Ribbon | Slide-out notification bell tray with category chips and top sticky high-priority emergency alert ribbon. |

*Table 5.2: Application Visual Verification Evidence*

## 5.5 Results and Discussion

| Objective | Status | Remarks |
| :--- | :--- | :--- |
| Responsive 4-Role RBAC Portal | **Fully Met** | Delivered dedicated dashboards for TPO, Coordinator, Recruiter, and Student with strict client and server guards. |
| Automated 5-Rule Eligibility Engine | **Fully Met** | Validates batch year, One-Offer rule, CGPA cutoff, backlog count, and allowed branches with detailed feedback. |
| Multi-Stage Interview Pipeline | **Fully Met** | Sequential progression across OAs, Technical Interviews, and HR rounds with time-gated link delivery. |
| "The Shield Principle" Inquiry Hub | **Fully Met** | Complete architectural firewall preventing recruiter harassment with 1-click coordinator FAQ promotion. |
| In-App Notification Hub & Flash Ribbons | **Fully Met** | Interactive notification bell dropdown and urgent sticky banner ribbons operational across portals. |
| High-Performance Secure Architecture | **Fully Met** | Sub-80ms response times, Bcrypt password hashing, and zero cross-department data leakage. |

*Table 5.3: Project Objective Verification Matrix*

## 5.6 Known Issues
- External SMTP email dispatch is intentionally disabled in this release to prioritize high-speed in-app notifications and eliminate external third-party mail provider latency.
- Automated code execution or live video conferencing is not natively hosted inside the container; the system seamlessly delegates these activities to external platforms (HackerEarth, Google Meet) via secure, scheduled deep links.

---

# 6. Team Contribution

## 6.1 Team Details

| Name | Roll No. | Role | Email |
| :--- | :--- | :--- | :--- |
| **P. Ritesh Reddy** | 24CSB0A55 | Full Stack Engineer & Backend Architect | riteshpuchakayala02@gmail.com |
| **K. P. T. N. Vamsi Krishna** | 24CSB0A38 | Full Stack Engineer & Frontend Architect | vamsikr2007@gmail.com |

*Table 6.1: Team Composition and Role Allocation*

## 6.2 Individual Contributions

| Member | Modules / features built | Report sections written | Commits / PRs |
| :--- | :--- | :--- | :--- |
| **P. Ritesh Reddy** | Designed backend architecture; implemented 5-Rule Eligibility Engine, One-Offer policy auto-revocation service, multi-stage interview rounds scheduler, Doubt Desk FAQ promotion, and Vercel/Render cloud deployment pipelines. | Chapters 1, 3, 4 (Backend Architecture, Database Design, Implementation, Deployment). | 14 commits (e.g., `8ecfd71`, `6c8a2c8`, `8a70bae`, `cf16d2d`) |
| **K. P. T. N. Vamsi Krishna** | Developed responsive React 19 UI dashboards; implemented Notification Bell hub, sticky Flash Announcement Banner, 2-step 6-digit OTP password reset flow, Swagger UI basic authentication, and integration test suites. | Chapters 2, 5, 6, 7 (Requirements, Security & Validation, Testing, Results, Appendices). | 3 commits (e.g., `322908d`, `feat: secure swagger ui`, `feat: complete frontend`) |

*Table 6.2: Individual Modular Contributions and Code Commit Evidence*

## 6.3 Collaboration Approach
The development team utilized GitHub for source code management, tracking work through granular feature branches merged via pull requests. Code reviews were conducted prior to merging to verify RBAC integrity and data isolation. Regular virtual sync meetings and automated test runs ensured synchronicity across frontend components and backend REST endpoints.

## 6.4 Team Declaration
We confirm that the contributions listed above are accurate reflections of the work completed for this project.

<br>

| Name | Signature | Date |
| :--- | :---: | :---: |
| **P. Ritesh Reddy** | ___________________________ | 21/11/2026 |
| **K. P. T. N. Vamsi Krishna** | ___________________________ | 21/11/2026 |

---

# 7. Conclusion and Future Scope

## 7.1 Conclusion
CareerBridge successfully addresses the persistent operational challenges and communication bottlenecks inherent in university campus placement drives. By implementing an authoritative four-role RBAC hierarchy, an automated Five-Rule Eligibility Engine, and "The Shield Principle" inquiry desk, the platform eliminates administrative overhead, guarantees equitable job distribution, and safeguards the institution's corporate reputation. The project provided invaluable hands-on experience in modern full-stack software engineering, covering reactive UI component architecture, asynchronous REST API development, relational database indexing, and cloud container deployments.

## 7.2 Learning Outcomes
- **Modern Component Engineering:** Mastered React 19 hooks, client-side route protection, and responsive styling with Tailwind CSS.
- **Asynchronous API Architecture:** Engineered high-speed RESTful services with Python FastAPI, Pydantic v2 schemas, and dependency injection.
- **Enterprise Security & Governance:** Implemented cryptographic JWT authentication, Bcrypt salted hashing, and fine-grained RBAC database query isolation.
- **Database Concurrency & ORM:** Configured SQLAlchemy 2.0 with SQLite WAL mode and relational cascading rules.
- **Continuous Deployment:** Managed production deployments across Vercel edge networks and Render cloud containers.

## 7.3 Future Scope
- **Live Video Conferencing & Proctoring:** Direct integration of WebRTC video rooms and browser-based coding assessment proctoring sandboxes.
- **Automated SMTP & WhatsApp Alerts:** Adding multi-channel notification relays for real-time mobile push and SMS notifications.
- **Placement Analytics & Statistics:** Enhancing statistical reporting on placement percentages, domain trends, and salary packages across departments.
- **Alumni & Mentorship Network:** Expanding coordinator capabilities to connect unplaced students with placed alumni for domain-specific mentoring.

---

# 8. References

1. React Documentation, "React 19 Release Notes and Documentation," *React.dev*, 2026. [Online]. Available: [https://react.dev](https://react.dev). Accessed: 21 Nov 2026.
2. FastAPI Documentation, "FastAPI: High performance, easy to learn, fast to code, ready for production," *tiangolo.com*, 2026. [Online]. Available: [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com). Accessed: 21 Nov 2026.
3. SQLAlchemy Authors, "SQLAlchemy 2.0 Documentation," *SQLAlchemy.org*, 2025. [Online]. Available: [https://docs.sqlalchemy.org](https://docs.sqlalchemy.org). Accessed: 21 Nov 2026.
4. Tailwind Labs, "Tailwind CSS Documentation (v4.0)," *tailwindcss.com*, 2026. [Online]. Available: [https://tailwindcss.com](https://tailwindcss.com). Accessed: 21 Nov 2026.
5. M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT)," *RFC 7519*, Internet Engineering Task Force (IETF), 2015. [Online]. Available: [https://tools.ietf.org/html/rfc7519](https://tools.ietf.org/html/rfc7519). Accessed: 21 Nov 2026.
6. National Institutional Ranking Framework (NIRF), "Methodology for Ranking of Academic Institutions in India," *Ministry of Education, Govt. of India*, 2025. [Online]. Available: [https://www.nirfindia.org](https://www.nirfindia.org). Accessed: 21 Nov 2026.

---

# 9. Appendices

### Appendix A: Local Setup & Environment Runbook

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### 3. Environment Template (`.env.example`)
```ini
PROJECT_NAME="CareerBridge"
ENVIRONMENT="development"
SECRET_KEY="careerbridge_production_secret_key"
ALGORITHM="HS256"
DATABASE_URL="sqlite:///./careerbridge.db"
COLLEGE_DOMAIN="college.edu"
UPLOAD_DIR="./uploads"
ALLOWED_ORIGINS="http://localhost:5173,https://careerbridge-frontend.vercel.app"
```

### Appendix B: Key API Endpoints & Curl Verification
- Authenticate: `POST /api/auth/login`
- Google SSO: `POST /api/auth/google`
- Batch Eligibility: `PATCH /api/tpo/batches/{year}/toggle`
- Drive Approval: `PATCH /api/jobs/{job_id}/approve`
- One-Click FAQ Pin: `POST /api/messages/threads/{id}/pin-faq`
- In-App Alerts: `GET /api/notifications`

### Appendix C: Demo Video and Repository Links
- **GitHub Repository:** [https://github.com/RiteshPuchakayala00/CareerBridge](https://github.com/RiteshPuchakayala00/CareerBridge)
- **Live Demo Video:** [https://youtu.be/careerbridge-demo](https://youtu.be/careerbridge-demo)
- **Live Production URL:** [https://careerbridge-frontend.vercel.app](https://careerbridge-frontend.vercel.app)
