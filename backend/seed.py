"""
CareerBridge Seed Script
Provisions the root TPO_ADMIN account during server deployment (Spec §2.B).
Also seeds test data for development purposes.
"""
from app.database import SessionLocal, engine, Base
from app.models.user import User, RoleEnum
from app.models.student import StudentProfile
from app.models.company import Company
from app.models.batch_eligibility import BatchEligibility
from app.services.auth_service import get_password_hash

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("=" * 60)
print("CareerBridge Database Seed")
print("=" * 60)

# ─── 1. Root TPO_ADMIN (Spec §2.B: provisioned during deployment) ───
tpo_email = "admin@careerbridge.com"
existing_tpo = db.query(User).filter(User.email == tpo_email).first()
if not existing_tpo:
    tpo_admin = User(
        email=tpo_email,
        full_name="Dr. Placement Director",
        hashed_password=get_password_hash("admin123"),
        role=RoleEnum.TPO_ADMIN,
        is_active=True
    )
    db.add(tpo_admin)
    db.commit()
    print(f"✅ Root TPO_ADMIN created: {tpo_email} / admin123")
else:
    tpo_admin = existing_tpo
    print(f"ℹ️  Root TPO_ADMIN exists: {tpo_email}")

# ─── 2. Test DEPT_COORDINATOR (CSE) ───
coord_email = "coordinator.cse@careerbridge.com"
if not db.query(User).filter(User.email == coord_email).first():
    coordinator = User(
        email=coord_email,
        full_name="Prof. Sharma (CSE)",
        hashed_password=get_password_hash("coord123"),
        role=RoleEnum.DEPT_COORDINATOR,
        department="CSE",
        is_active=True,
        invited_by_id=tpo_admin.id
    )
    db.add(coordinator)
    db.commit()
    print(f"✅ DEPT_COORDINATOR created: {coord_email} / coord123 (CSE)")
else:
    print(f"ℹ️  DEPT_COORDINATOR exists: {coord_email}")

# ─── 3. Test RECRUITER ───
recruiter_email = "recruiter@techcorp.com"
existing_recruiter = db.query(User).filter(User.email == recruiter_email).first()
if not existing_recruiter:
    recruiter = User(
        email=recruiter_email,
        full_name="Priya HR",
        hashed_password=get_password_hash("recruiter123"),
        role=RoleEnum.RECRUITER,
        is_active=True,
        invited_by_id=tpo_admin.id
    )
    db.add(recruiter)
    db.flush()
    
    company = Company(
        user_id=recruiter.id,
        company_name="TechCorp Solutions",
        industry="Information Technology",
        website="https://techcorp.example.com",
        description="Leading technology solutions company"
    )
    db.add(company)
    db.commit()
    print(f"✅ RECRUITER created: {recruiter_email} / recruiter123 (TechCorp)")
else:
    print(f"ℹ️  RECRUITER exists: {recruiter_email}")

# ─── 4. Test STUDENTS ───
test_students = [
    {"email": "student1@college.edu", "full_name": "Akshay Kumar", "roll": "CSE2026001", "dept": "CSE", "year": 2026, "cgpa": 8.5, "backlogs": 0},
    {"email": "student2@college.edu", "full_name": "Riya Patel", "roll": "CSE2026002", "dept": "CSE", "year": 2026, "cgpa": 7.2, "backlogs": 0},
    {"email": "student3@college.edu", "full_name": "Arjun Reddy", "roll": "ECE2026001", "dept": "ECE", "year": 2026, "cgpa": 9.1, "backlogs": 0},
    {"email": "student4@college.edu", "full_name": "Sneha Gupta", "roll": "MECH2026001", "dept": "MECH", "year": 2027, "cgpa": 6.8, "backlogs": 1},
]

for s in test_students:
    if not db.query(User).filter(User.email == s["email"]).first():
        student_user = User(
            email=s["email"],
            full_name=s["full_name"],
            hashed_password=get_password_hash("student123"),
            role=RoleEnum.STUDENT,
            department=s["dept"],
            is_active=True
        )
        db.add(student_user)
        db.flush()
        
        profile = StudentProfile(
            user_id=student_user.id,
            roll_number=s["roll"],
            department=s["dept"],
            graduation_year=s["year"],
            cgpa=s["cgpa"],
            active_backlogs=s["backlogs"]
        )
        db.add(profile)
        db.commit()
        print(f"✅ STUDENT created: {s['email']} / student123 ({s['dept']}, CGPA: {s['cgpa']})")
    else:
        print(f"ℹ️  STUDENT exists: {s['email']}")

# ─── 5. Batch Eligibility (enable 2026 batch, disable 2027) ───
for year, active in [(2026, True), (2027, True), (2028, False)]:
    existing_batch = db.query(BatchEligibility).filter(BatchEligibility.graduation_year == year).first()
    if not existing_batch:
        batch = BatchEligibility(graduation_year=year, is_active=active)
        db.add(batch)
        db.commit()
        status_text = "ACTIVE" if active else "BLOCKED"
        print(f"✅ Batch {year}: {status_text}")
    else:
        print(f"ℹ️  Batch {year} config exists")

db.close()

print("=" * 60)
print("Seed complete! Test credentials:")
print("  TPO Admin:    admin@careerbridge.com / admin123")
print("  Coordinator:  coordinator.cse@careerbridge.com / coord123")
print("  Recruiter:    recruiter@techcorp.com / recruiter123")
print("  Students:     student1@college.edu / student123 (and similar)")
print("=" * 60)
