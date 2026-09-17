from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.app.models.lake import LakeStatus

class LakeBase(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    area_hectares: float
    perimeter_km: float
    platform_health_score: int
    status: LakeStatus
    boundary_geojson: Optional[str] = None

class LakeCreate(LakeBase):
    pass

class LakeResponse(LakeBase):
    id: int
    created_at: datetime
    active_issue_count: int = 0
    resolved_issue_count: int = 0
    total_issue_count: int = 0

    class Config:
        from_attributes = True

class LakeStatistics(BaseModel):
    lake_id: int
    lake_name: str
    platform_health_score: int
    status: LakeStatus
    total_reports: int
    active_reports: int
    resolved_reports: int
    resolution_rate_percent: float
    category_distribution: List[Dict[str, Any]]
    severity_distribution: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]
    disclaimer: str = "This score reflects environmental issues reported through the platform and is not a substitute for laboratory water-quality testing (Demonstration Dataset)."
