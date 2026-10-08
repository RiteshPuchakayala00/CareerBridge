from app.database import SessionLocal, engine, Base
from app.models.user import User, RoleEnum
from app.services.auth_service import get_password_hash

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Check if user exists
users_to_seed = [
    {
        "email": "test@careerbridge.com",
        "full_name": "Test Student",
        "role": RoleEnum.STUDENT,
        "password": "password123"
    },
    {
        "email": "recruiter@careerbridge.com",
        "full_name": "Tech Corp Recruiter",
        "role": RoleEnum.RECRUITER,
        "password": "password123"
    },
    {
        "email": "admin@careerbridge.com",
        "full_name": "TPO Admin",
        "role": RoleEnum.TPO_ADMIN,
        "password": "password123"
    }
]

for user_data in users_to_seed:
    existing_user = db.query(User).filter(User.email == user_data["email"]).first()
    if not existing_user:
        new_user = User(
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            full_name=user_data["full_name"],
            role=user_data["role"]
        )
        db.add(new_user)
        db.commit()
        print(f"Test user created: {user_data['email']} / {user_data['password']} ({user_data['role']})")
    else:
        print(f"Test user already exists: {user_data['email']}")

db.close()
