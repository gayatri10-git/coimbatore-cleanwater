import math
from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.incident import Incident, IncidentStatus, IncidentSeverity
from backend.app.models.lake import Lake

EARTH_RADIUS_METERS = 6371000.0

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two geographic coordinates in meters."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c

def find_incidents_within_radius(
    db: Session,
    lat: float,
    lon: float,
    radius_meters: float,
    unresolved_only: bool = False
) -> List[Incident]:
    """Finds incidents within a given radius in meters from coordinates."""
    # Bounding box pre-filter for performance
    lat_delta = (radius_meters / 111320.0) * 1.2
    lon_delta = (radius_meters / (111320.0 * math.cos(math.radians(lat)))) * 1.2

    query = db.query(Incident).filter(
        Incident.latitude.between(lat - lat_delta, lat + lat_delta),
        Incident.longitude.between(lon - lon_delta, lon + lon_delta)
    )
    if unresolved_only:
        query = query.filter(Incident.status.in_([IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS]))

    candidates = query.all()
    results = []
    for inc in candidates:
        dist = haversine_distance_meters(lat, lon, inc.latitude, inc.longitude)
        if dist <= radius_meters:
            results.append(inc)
    return results

def detect_duplicate_incidents(
    db: Session,
    category_id: int,
    lat: float,
    lon: float,
    threshold_meters: float = 200.0
) -> List[Incident]:
    """Checks for nearby unresolved incidents in the same category within radius."""
    nearby = find_incidents_within_radius(db, lat, lon, threshold_meters, unresolved_only=True)
    duplicates = [inc for inc in nearby if inc.category_id == category_id]
    return duplicates

def calculate_priority_score(incident: Incident, db: Session) -> Tuple[int, List[str]]:
    """Rule-based smart priority scoring for municipal triage."""
    base_scores = {
        IncidentSeverity.CRITICAL: 100,
        IncidentSeverity.HIGH: 75,
        IncidentSeverity.MEDIUM: 50,
        IncidentSeverity.LOW: 25,
    }
    reasons = [f"{incident.severity.value} severity baseline ({base_scores.get(incident.severity, 50)} pts)"]
    score = base_scores.get(incident.severity, 50)

    # Age penalty for unresolved reports (older = higher urgency)
    if incident.status in [IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS]:
        now = datetime.utcnow()
        age_days = (now - incident.created_at).days
        if age_days > 0:
            age_pts = min(age_days * 5, 25)
            score += age_pts
            reasons.append(f"Reported {age_days} day{'s' if age_days > 1 else ''} ago (+{age_pts} pts)")

        # Spatial cluster check (repeat incidents within 500m)
        nearby = find_incidents_within_radius(db, incident.latitude, incident.longitude, 500.0, unresolved_only=True)
        # Exclude this incident itself
        other_nearby = [inc for inc in nearby if inc.id != incident.id]
        if other_nearby:
            cluster_pts = min(len(other_nearby) * 8, 30)
            score += cluster_pts
            reasons.append(f"{len(other_nearby)} similar unresolved report{'s' if len(other_nearby) > 1 else ''} within 500m (+{cluster_pts} pts)")

    final_score = min(max(score, 10), 100)
    return final_score, reasons

def calculate_lake_health_score(lake_id: int, db: Session) -> Tuple[int, str]:
    """
    Platform-derived demonstration health score.
    Reflects active citizen reports and resolution trends.
    Explicitly labeled as platform demonstration score, not laboratory water testing.
    """
    base_score = 100
    active_incidents = db.query(Incident).filter(
        Incident.lake_id == lake_id,
        Incident.status.in_([IncidentStatus.PENDING, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS])
    ).all()

    resolved_count = db.query(Incident).filter(
        Incident.lake_id == lake_id,
        Incident.status.in_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
    ).count()

    penalty = 0
    for inc in active_incidents:
        if inc.severity == IncidentSeverity.CRITICAL:
            penalty += 15
        elif inc.severity == IncidentSeverity.HIGH:
            penalty += 10
        elif inc.severity == IncidentSeverity.MEDIUM:
            penalty += 5
        elif inc.severity == IncidentSeverity.LOW:
            penalty += 2

    # Reward for high resolution
    bonus = min(resolved_count * 2, 10)
    final_score = max(min(base_score - penalty + bonus, 100), 20)

    if final_score >= 80:
        status_label = "healthy"
    elif final_score >= 50:
        status_label = "warning"
    else:
        status_label = "critical"

    return final_score, status_label
