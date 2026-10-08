from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import csv
import io

from ..database import get_db
from ..models.user import User, RoleEnum
from ..models.student import StudentProfile
from ..schemas.user import UserCreate, UserResponse, Token
from ..services.auth_service import get_password_hash, verify_password, create_access_token, get_current_user, require_role
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/bulk-register", status_code=status.HTTP_201_CREATED)
async def bulk_register_users(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
    # current_user: User = Depends(require_role([RoleEnum.TPO_ADMIN])) # Disabled temporarily so you can test it easily
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    users_created = 0
    errors = []

    for row_num, row in enumerate(csv_reader, start=2): # Row 1 is header
        try:
            email = row.get("email", "").strip()
            full_name = row.get("full_name", "").strip()
            role_str = row.get("role", "STUDENT").strip().upper()
            password = row.get("password", "College@123").strip() # Default password
            roll_number = row.get("roll_number", "").strip()
            department = row.get("department", "").strip()

            if not email or not full_name:
                errors.append(f"Row {row_num}: Missing email or full_name")
                continue

            # Check if exists
            if db.query(User).filter(User.email == email).first():
                errors.append(f"Row {row_num}: Email {email} already exists")
                continue
                
            # Determine Role
            try:
                role = RoleEnum(role_str)
            except ValueError:
                role = RoleEnum.STUDENT

            # Create User
            new_user = User(
                email=email,
                full_name=full_name,
                hashed_password=get_password_hash(password),
                role=role
            )
            db.add(new_user)
            db.flush() # Get user.id immediately without committing
            
            # If student, link a profile
            if role == RoleEnum.STUDENT:
                student_profile = StudentProfile(
                    user_id=new_user.id,
                    roll_number=roll_number if roll_number else None,
                    department=department if department else None
                )
                db.add(student_profile)

            users_created += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()
    
    return {
        "message": f"Successfully onboarded {users_created} users.",
        "errors": errors
    }
