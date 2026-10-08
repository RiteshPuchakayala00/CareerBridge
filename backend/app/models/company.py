from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    company_name = Column(String, index=True, nullable=False)
    industry = Column(String)
    website = Column(String)
    description = Column(Text)
    logo_url = Column(String, nullable=True)

    # Relationships
    user = relationship("User", backref="company_profile")
    jobs = relationship("JobPosting", back_populates="company", cascade="all, delete")
