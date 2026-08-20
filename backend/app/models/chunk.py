from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536))

    document = relationship("Document", back_populates="chunks")
