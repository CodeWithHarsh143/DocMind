from sqlalchemy import Integer, String, Column, DateTime
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    organization_members = relationship("OrganizationMember", back_populates="user")
    documents = relationship("Document", back_populates="owner")
