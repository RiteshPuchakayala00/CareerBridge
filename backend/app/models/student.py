from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from ..database import Base

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    roll_number = Column(String, unique=True, index=True, nullable=True)
    department = Column(String, index=True, nullable=True)
    graduation_year = Column(Integer, index=True, nullable=True)
    cgpa = Column(Float, nullable=True)
    active_backlogs = Column(Integer, default=0)
    
    # Profile Enrichment (student-editable)
    linkedin_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    
    # AI & Resume Features
    resume_url = Column(String, nullable=True)
    resume_parsed_data = Column(JSON, nullable=True)  # Full parsed resume JSON
    skills_list = Column(JSON, nullable=True)         # AI-parsed + manually added skill tags
    
    # Placement status
    is_placed = Column(Integer, default=0)  # 0 = unplaced, 1 = placed
    
    # Relationship to User
    user = relationship("User", backref="student_profile")

    @property
    def phone_number(self):
        return self.contact_number

    @phone_number.setter
    def phone_number(self, val):
        self.contact_number = val

    @property
    def skills(self):
        return self.skills_list

    @skills.setter
    def skills(self, val):
        self.skills_list = val
