from enum import Enum
from sqlalchemy import ForeignKey, Integer, String, Column, DateTime
from sqlalchemy.types import Enum as SQLEnum
from datetime import datetime, timezone

from sqlalchemy.orm import relationship
from app.database import Base


class RoleEnum(str, Enum):
    ADMIN = "admin"
    USER = "user"


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    members = relationship("OrganizationMember", back_populates="organization")
    doucments = relationship("Document", back_populates="organization")


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.USER)
    user = relationship("User", back_populates="organization_members")
    organization = relationship("Organization", back_populates="members")
