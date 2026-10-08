# CareerBridge - AI & RAG-Powered Placement Platform

## Project Overview
CareerBridge is an intelligent campus placement and internship platform that automates eligibility screening, resume analysis, job matchmaking, and interview preparation using GenAI and RAG.

## Project Structure
```
FSD_proj/
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint
│   │   ├── config.py         # App configuration & settings
│   │   ├── database.py       # SQLAlchemy Database session
│   │   ├── models/           # DB Models (User, Student, Job, Application, etc.)
│   │   ├── schemas/          # Pydantic Schemas
│   │   ├── routes/           # API Endpoints (Auth, Jobs, Students, AI, Analytics)
│   │   ├── services/         # Business logic & AI/RAG engine
│   │   └── uploads/          # Resumes and documents
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variables template
│
└── frontend/                 # React + Vite + Tailwind CSS Frontend
    ├── src/
    │   ├── components/       # Reusable UI components
    │   ├── pages/            # Role dashboards & feature views
    │   ├── context/          # Auth and State Context
    │   └── services/         # API client & endpoints
    └── package.json
```

## Quick Start Guide

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Interactive API docs available at: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`
