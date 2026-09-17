from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database.session import get_db
from backend.app.models.lake import Lake, LakeStatus
from backend.app.models.category import IssueCategory
from backend.app.models.incident import Incident, IncidentStatus, IncidentSeverity
from backend.app.schemas.lake import LakeResponse, LakeStatistics
from backend.app.schemas.category import CategoryResponse
from backend.app.services.spatial import calculate_lake_health_score

router = APIRouter(tags=["Lakes & Categories"])

@router.get("/lakes", response_model=list[LakeResponse])
def get_all_lakes(db: Session = Depends(get_db)):
    lakes = db.query(Lake).order_by(Lake.name.asc()).all()
    results = []
    for l in lakes:
        active = db.query(Incident).filter(
            Incident.lake_id == l.id,
            Incident.status.in_([IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS])
        ).count()
        resolved = db.query(Incident).filter(
            Incident.lake_id == l.id,
            Incident.status.in_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
        ).count()

        # Recalculate dynamic platform health score
        score, status_label = calculate_lake_health_score(l.id, db)
        l.platform_health_score = score
        l.status = status_label

        res = LakeResponse.from_orm(l)
        res.active_issue_count = active
        res.resolved_issue_count = resolved
        res.total_issue_count = active + resolved
        results.append(res)
    return results

@router.get("/lakes/{lake_id}", response_model=LakeResponse)
def get_lake_by_id(lake_id: int, db: Session = Depends(get_db)):
    lake = db.query(Lake).filter(Lake.id == lake_id).first()
    if not lake:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lake not found.")

    active = db.query(Incident).filter(
        Incident.lake_id == lake.id,
        Incident.status.in_([IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS])
    ).count()
    resolved = db.query(Incident).filter(
        Incident.lake_id == lake.id,
        Incident.status.in_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
    ).count()

    score, status_label = calculate_lake_health_score(lake.id, db)
    lake.platform_health_score = score
    lake.status = status_label

    res = LakeResponse.from_orm(lake)
    res.active_issue_count = active
    res.resolved_issue_count = resolved
    res.total_issue_count = active + resolved
    return res

@router.get("/lakes/{lake_id}/statistics", response_model=LakeStatistics)
def get_lake_statistics(lake_id: int, db: Session = Depends(get_db)):
    lake = db.query(Lake).filter(Lake.id == lake_id).first()
    if not lake:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lake not found.")

    all_incidents = db.query(Incident).filter(Incident.lake_id == lake.id).all()
    total = len(all_incidents)
    active = sum(1 for i in all_incidents if i.status in [IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS])
    resolved = sum(1 for i in all_incidents if i.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
    resolution_rate = round((resolved / total * 100.0), 1) if total > 0 else 100.0

    # Category distribution
    cat_counts = {}
    for i in all_incidents:
        cname = i.category.name if i.category else "Other"
        cat_counts[cname] = cat_counts.get(cname, 0) + 1
    category_distribution = [{"name": k, "count": v} for k, v in cat_counts.items()]

    # Severity distribution
    sev_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for i in all_incidents:
        sev_counts[i.severity.value] = sev_counts.get(i.severity.value, 0) + 1
    severity_distribution = [{"severity": k, "count": v} for k, v in sev_counts.items()]

    # Monthly trend
    monthly_map = {}
    for i in all_incidents:
        month_key = i.created_at.strftime("%b %Y")
        monthly_map[month_key] = monthly_map.get(month_key, 0) + 1
    monthly_trend = [{"month": k, "count": v} for k, v in monthly_map.items()]

    score, status_label = calculate_lake_health_score(lake.id, db)

    return LakeStatistics(
        lake_id=lake.id,
        lake_name=lake.name,
        platform_health_score=score,
        status=status_label,
        total_reports=total,
        active_reports=active,
        resolved_reports=resolved,
        resolution_rate_percent=resolution_rate,
        category_distribution=category_distribution,
        severity_distribution=severity_distribution,
        monthly_trend=monthly_trend,
    )

@router.get("/categories", response_model=list[CategoryResponse])
def get_all_categories(db: Session = Depends(get_db)):
    categories = db.query(IssueCategory).order_by(IssueCategory.id.asc()).all()
    return categories
