from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.models.incident import IncidentSeverity, IncidentStatus
from backend.app.schemas.user import UserResponse
from backend.app.schemas.category import CategoryResponse

class IncidentStatusHistoryResponse(BaseModel):
    id: int
    incident_id: int
    old_status: Optional[IncidentStatus] = None
    new_status: IncidentStatus
    changed_by: Optional[int] = None
    changer_name: Optional[str] = None
    note: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class IncidentCreate(BaseModel):
    lake_id: int
    category_id: int
    description: str = Field(min_length=5)
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    latitude: float
    longitude: float
    image_url: Optional[str] = None

class IncidentUpdate(BaseModel):
    severity: Optional[IncidentSeverity] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None

class IncidentAssignRequest(BaseModel):
    assigned_to: int
    note: Optional[str] = "Assigned by municipal supervisor"

class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    note: Optional[str] = None
    resolution_note: Optional[str] = None

class IncidentResponse(BaseModel):
    id: int
    report_code: str
    user_id: int
    lake_id: int
    lake_name: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    latitude: float
    longitude: float
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    assigned_to: Optional[int] = None
    assignee_name: Optional[str] = None
    resolution_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    priority_score: Optional[int] = 50
    priority_reasons: Optional[List[str]] = []

    class Config:
        from_attributes = True

class IncidentDetailResponse(IncidentResponse):
    reporter: Optional[UserResponse] = None
    assignee: Optional[UserResponse] = None
    category: Optional[CategoryResponse] = None
    status_history: List[IncidentStatusHistoryResponse] = []

class DuplicateCheckResponse(BaseModel):
    has_duplicate: bool
    duplicate_count: int
    message: str
    existing_incidents: List[IncidentResponse] = []
