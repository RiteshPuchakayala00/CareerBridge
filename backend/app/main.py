from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import engine, Base
from .config import settings
from .routes import auth

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CareerBridge API",
    description="AI-Powered Campus Placement & Internship Platform",
    version="2.0.0"
)

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files (for resumes/offer letters)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to CareerBridge 2.0 API"}
