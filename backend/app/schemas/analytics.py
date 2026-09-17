from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class AnalyticsOverview(BaseModel):
    total_lakes: int
    total_reports: int
    pending_reports: int
    in_progress_reports: int
    resolved_reports: int
    closed_reports: int
    resolution_rate_percent: float
    avg_resolution_hours: float
    critical_unresolved_count: int
    high_unresolved_count: int
    disclaimer: str = "Demonstration Dataset - Figures derived from simulated citizen reports for academic evaluation."

class HotspotPoint(BaseModel):
    id: int
    latitude: float
    longitude: float
    severity: str
    intensity: float  # 0.2 to 1.0 for Leaflet heatmaps
    lake_name: str
    category_name: str
    status: str
    report_code: str
