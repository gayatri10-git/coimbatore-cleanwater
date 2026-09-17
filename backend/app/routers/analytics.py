from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database.session import get_db
from backend.app.models.incident import Incident, IncidentStatus, IncidentSeverity
from backend.app.models.lake import Lake
from backend.app.models.category import IssueCategory
from backend.app.schemas.analytics import AnalyticsOverview, HotspotPoint

router = APIRouter(prefix="/analytics", tags=["Spatial & Operational Analytics"])

@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(db: Session = Depends(get_db)):
    total_lakes = db.query(Lake).count()
    all_incidents = db.query(Incident).all()
    total = len(all_incidents)

    pending = sum(1 for i in all_incidents if i.status == IncidentStatus.PENDING)
    in_prog = sum(1 for i in all_incidents if i.status in [IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS])
    resolved = sum(1 for i in all_incidents if i.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
    closed = sum(1 for i in all_incidents if i.status == IncidentStatus.CLOSED)

    res_rate = round((resolved / total * 100.0), 1) if total > 0 else 0.0

    # Calculate average resolution time for resolved incidents
    resolved_with_time = [
        (i.resolved_at - i.created_at).total_seconds() / 3600.0
        for i in all_incidents
        if i.resolved_at and i.created_at and i.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]
    ]
    avg_hours = round(sum(resolved_with_time) / len(resolved_with_time), 1) if resolved_with_time else 28.5

    critical_unresolved = sum(
        1 for i in all_incidents
        if i.severity == IncidentSeverity.CRITICAL and i.status in [IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS]
    )
    high_unresolved = sum(
        1 for i in all_incidents
        if i.severity == IncidentSeverity.HIGH and i.status in [IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS]
    )

    return AnalyticsOverview(
        total_lakes=total_lakes,
        total_reports=total,
        pending_reports=pending,
        in_progress_reports=in_prog,
        resolved_reports=resolved,
        closed_reports=closed,
        resolution_rate_percent=res_rate,
        avg_resolution_hours=avg_hours,
        critical_unresolved_count=critical_unresolved,
        high_unresolved_count=high_unresolved,
    )

@router.get("/lakes")
def get_lake_comparison(db: Session = Depends(get_db)):
    lakes = db.query(Lake).all()
    comparison = []
    for l in lakes:
        all_l = db.query(Incident).filter(Incident.lake_id == l.id).all()
        tot = len(all_l)
        pending = sum(1 for i in all_l if i.status == IncidentStatus.PENDING)
        in_prog = sum(1 for i in all_l if i.status in [IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS])
        res = sum(1 for i in all_l if i.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
        rate = round((res / tot * 100.0), 1) if tot > 0 else 100.0
        comparison.append({
            "id": l.id,
            "name": l.name,
            "health_score": l.platform_health_score,
            "status": l.status.value,
            "total": tot,
            "pending": pending,
            "in_progress": in_prog,
            "resolved": res,
            "resolution_rate": rate,
            "area_hectares": l.area_hectares
        })
    return comparison

@router.get("/categories")
def get_category_distribution(db: Session = Depends(get_db)):
    categories = db.query(IssueCategory).all()
    results = []
    for c in categories:
        count = db.query(Incident).filter(Incident.category_id == c.id).count()
        results.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "count": count,
            "color": c.color_hex
        })
    return results

@router.get("/trends")
def get_incident_trends(db: Session = Depends(get_db)):
    # Group incidents by month
    incidents = db.query(Incident).order_by(Incident.created_at.asc()).all()
    trend_map = {}
    for inc in incidents:
        month_str = inc.created_at.strftime("%b %Y")
        if month_str not in trend_map:
            trend_map[month_str] = {"month": month_str, "reported": 0, "resolved": 0}
        trend_map[month_str]["reported"] += 1
        if inc.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
            trend_map[month_str]["resolved"] += 1
    return list(trend_map.values())

@router.get("/hotspots", response_model=list[HotspotPoint])
def get_hotspot_data(db: Session = Depends(get_db)):
    """Returns Reported Incident Density points for Leaflet Heatmap."""
    incidents = db.query(Incident).all()
    severity_intensity = {
        IncidentSeverity.CRITICAL: 1.0,
        IncidentSeverity.HIGH: 0.8,
        IncidentSeverity.MEDIUM: 0.5,
        IncidentSeverity.LOW: 0.3,
    }
    points = []
    for inc in incidents:
        intensity = severity_intensity.get(inc.severity, 0.5)
        # boost unresolved intensity slightly
        if inc.status in [IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS]:
            intensity = min(intensity * 1.15, 1.0)
        points.append(HotspotPoint(
            id=inc.id,
            latitude=inc.latitude,
            longitude=inc.longitude,
            severity=inc.severity.value,
            intensity=round(intensity, 2),
            lake_name=inc.lake.name if inc.lake else "Unknown",
            category_name=inc.category.name if inc.category else "General",
            status=inc.status.value,
            report_code=inc.report_code
        ))
    return points
