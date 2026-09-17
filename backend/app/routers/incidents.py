import os
import uuid
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from backend.app.database.session import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.lake import Lake
from backend.app.models.category import IssueCategory
from backend.app.models.incident import Incident, IncidentSeverity, IncidentStatus, IncidentStatusHistory
from backend.app.models.notification import Notification
from backend.app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentAssignRequest,
    IncidentStatusUpdate,
    IncidentResponse,
    IncidentDetailResponse,
    DuplicateCheckResponse,
)
from backend.app.auth.security import get_current_user, get_optional_current_user, require_roles
from backend.app.services.spatial import (
    detect_duplicate_incidents,
    calculate_priority_score,
    find_incidents_within_radius,
)

router = APIRouter(prefix="/incidents", tags=["Incidents & GIS Reports"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_report_code(db: Session) -> str:
    """Generates unique report identifier in format CW-2026-XXXXX"""
    year = datetime.utcnow().year
    count = db.query(Incident).count() + 1
    code = f"CW-{year}-{count:05d}"
    # Safety check against collisions
    while db.query(Incident).filter(Incident.report_code == code).first():
        count += 1
        code = f"CW-{year}-{count:05d}"
    return code

def map_incident_to_response(inc: Incident, db: Session) -> IncidentResponse:
    priority, reasons = calculate_priority_score(inc, db)
    res = IncidentResponse(
        id=inc.id,
        report_code=inc.report_code,
        user_id=inc.user_id,
        lake_id=inc.lake_id,
        lake_name=inc.lake.name if inc.lake else None,
        category_id=inc.category_id,
        category_name=inc.category.name if inc.category else None,
        category_color=inc.category.color_hex if inc.category else None,
        description=inc.description,
        severity=inc.severity,
        status=inc.status,
        latitude=inc.latitude,
        longitude=inc.longitude,
        image_url=inc.image_url,
        created_at=inc.created_at,
        updated_at=inc.updated_at,
        assigned_to=inc.assigned_to,
        assignee_name=inc.assignee.full_name if inc.assignee else None,
        resolution_note=inc.resolution_note,
        resolved_at=inc.resolved_at,
        priority_score=priority,
        priority_reasons=reasons,
    )
    return res

@router.post("/check-duplicates", response_model=DuplicateCheckResponse)
def check_duplicate_reports(
    category_id: int = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    threshold_meters: float = Query(200.0),
    db: Session = Depends(get_db)
):
    duplicates = detect_duplicate_incidents(db, category_id, latitude, longitude, threshold_meters)
    mapped = [map_incident_to_response(inc, db) for inc in duplicates]
    has_dup = len(mapped) > 0
    msg = f"Found {len(mapped)} similar unresolved report(s) within {int(threshold_meters)}m." if has_dup else "No duplicate unresolved reports found nearby."
    return DuplicateCheckResponse(
        has_duplicate=has_dup,
        duplicate_count=len(mapped),
        message=msg,
        existing_incidents=mapped
    )

@router.post("/upload-photo")
def upload_incident_photo(file: UploadFile = File(...)):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WEBP images are supported.")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    unique_name = f"incident_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"image_url": f"/uploads/{unique_name}", "filename": unique_name}

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    # If anonymous/demo submission without auth, associate with citizen demo user or first citizen
    user_id = current_user.id if current_user else 1
    report_code = generate_report_code(db)
    location_wkt = f"POINT({payload.longitude} {payload.latitude})"

    incident = Incident(
        report_code=report_code,
        user_id=user_id,
        lake_id=payload.lake_id,
        category_id=payload.category_id,
        description=payload.description,
        severity=payload.severity,
        status=IncidentStatus.PENDING,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_wkt=location_wkt,
        image_url=payload.image_url,
    )
    db.add(incident)
    db.flush()

    # Create initial status history entry
    history = IncidentStatusHistory(
        incident_id=incident.id,
        old_status=None,
        new_status=IncidentStatus.PENDING,
        changed_by=user_id,
        note="Incident report submitted by citizen"
    )
    db.add(history)

    # In-app notification for citizen
    notif = Notification(
        user_id=user_id,
        incident_id=incident.id,
        title="Report Submitted",
        message=f"Your environmental report {incident.report_code} has been registered and queued for municipal inspection.",
        type="info"
    )
    db.add(notif)

    db.commit()
    db.refresh(incident)
    return map_incident_to_response(incident, db)

@router.get("", response_model=list[IncidentResponse])
def list_incidents(
    lake_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    severity: Optional[IncidentSeverity] = Query(None),
    status_filter: Optional[IncidentStatus] = Query(None, alias="status"),
    user_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("newest"),  # newest, priority, severity
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)

    if lake_id:
        query = query.filter(Incident.lake_id == lake_id)
    if category_id:
        query = query.filter(Incident.category_id == category_id)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if user_id:
        query = query.filter(Incident.user_id == user_id)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Incident.report_code.ilike(term)) |
            (Incident.description.ilike(term))
        )

    incidents = query.order_by(desc(Incident.created_at)).limit(limit).offset(offset).all()
    mapped = [map_incident_to_response(inc, db) for inc in incidents]

    if sort_by == "priority":
        mapped.sort(key=lambda x: x.priority_score or 0, reverse=True)
    elif sort_by == "severity":
        sev_rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        mapped.sort(key=lambda x: sev_rank.get(x.severity.value, 0), reverse=True)

    return mapped

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident_by_id(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident report not found.")

    base_res = map_incident_to_response(incident, db)

    # Format history with changer names
    history_entries = []
    for h in incident.status_history:
        history_entries.append({
            "id": h.id,
            "incident_id": h.incident_id,
            "old_status": h.old_status,
            "new_status": h.new_status,
            "changed_by": h.changed_by,
            "changer_name": h.user.full_name if h.user else "System",
            "note": h.note,
            "timestamp": h.timestamp
        })

    detail_res = IncidentDetailResponse(
        **base_res.dict(),
        reporter=incident.reporter,
        assignee=incident.assignee,
        category=incident.category,
        status_history=history_entries
    )
    return detail_res

@router.post("/{incident_id}/assign", response_model=IncidentResponse)
def assign_incident(
    incident_id: int,
    payload: IncidentAssignRequest,
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    assignee = db.query(User).filter(User.id == payload.assigned_to).first()
    if not assignee:
        raise HTTPException(status_code=400, detail="Assigned staff user does not exist.")

    old_status = incident.status
    incident.assigned_to = payload.assigned_to
    if incident.status == IncidentStatus.PENDING:
        incident.status = IncidentStatus.ASSIGNED

    # Audit history
    hist = IncidentStatusHistory(
        incident_id=incident.id,
        old_status=old_status,
        new_status=incident.status,
        changed_by=current_user.id,
        note=f"Assigned to {assignee.full_name}: {payload.note}"
    )
    db.add(hist)

    # Notify reporter
    notif = Notification(
        user_id=incident.user_id,
        incident_id=incident.id,
        title="Officer Assigned to Your Report",
        message=f"Report {incident.report_code} has been assigned to municipal officer {assignee.full_name}.",
        type="assignment"
    )
    db.add(notif)

    db.commit()
    db.refresh(incident)
    return map_incident_to_response(incident, db)

@router.post("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: int,
    payload: IncidentStatusUpdate,
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    # Requirement: Require a resolution note before an incident can be marked RESOLVED.
    if payload.status == IncidentStatus.RESOLVED:
        if not payload.resolution_note and not incident.resolution_note:
            raise HTTPException(
                status_code=400,
                detail="A detailed resolution note is required before an incident can be marked RESOLVED."
            )
        incident.resolution_note = payload.resolution_note or incident.resolution_note
        incident.resolved_at = datetime.utcnow()

    old_status = incident.status
    incident.status = payload.status

    # Audit history record
    hist = IncidentStatusHistory(
        incident_id=incident.id,
        old_status=old_status,
        new_status=payload.status,
        changed_by=current_user.id,
        note=payload.note or f"Status transitioned to {payload.status.value}"
    )
    db.add(hist)

    # Citizen Notification
    status_messages = {
        IncidentStatus.IN_PROGRESS: f"Investigation has begun on your report {incident.report_code}.",
        IncidentStatus.RESOLVED: f"Your reported issue {incident.report_code} has been marked RESOLVED. Note: {incident.resolution_note}",
        IncidentStatus.CLOSED: f"Your report {incident.report_code} has been verified and closed.",
    }
    if payload.status in status_messages:
        notif = Notification(
            user_id=incident.user_id,
            incident_id=incident.id,
            title=f"Report {payload.status.value.title()}",
            message=status_messages[payload.status],
            type="resolution" if payload.status == IncidentStatus.RESOLVED else "info"
        )
        db.add(notif)

    db.commit()
    db.refresh(incident)
    return map_incident_to_response(incident, db)
