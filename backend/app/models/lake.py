import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class LakeStatus(str, enum.Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"

class Lake(Base):
    __tablename__ = "lakes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    area_hectares = Column(Float, nullable=False, default=20.0)
    perimeter_km = Column(Float, nullable=False, default=2.5)
    platform_health_score = Column(Integer, nullable=False, default=85)
    status = Column(Enum(LakeStatus), default=LakeStatus.HEALTHY, nullable=False, index=True)
    boundary_geojson = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    incidents = relationship("Incident", back_populates="lake", cascade="all, delete-orphan")
