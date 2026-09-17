from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from backend.app.database.session import get_db
from backend.app.models.incident import Incident, IncidentStatus, IncidentSeverity
from backend.app.models.lake import Lake
from backend.app.schemas.incident import IncidentResponse
from backend.app.services.spatial import find_incidents_within_radius, haversine_distance_meters, calculate_priority_score

router = APIRouter(prefix="/gis", tags=["GIS & Spatial Queries"])

@router.get("/lake/{lake_id}/incidents-within-radius")
def get_incidents_near_lake(
    lake_id: int,
    radius_meters: float = Query(1500.0, ge=100, le=10000),
    db: Session = Depends(get_db)
):
    """Finds all environmental reports within specified radius meters of a lake center."""
    lake = db.query(Lake).filter(Lake.id == lake_id).first()
    if not lake:
        raise HTTPException(status_code=404, detail="Lake not found.")

    incidents = find_incidents_within_radius(db, lake.latitude, lake.longitude, radius_meters)
    results = []
    for inc in incidents:
        priority, reasons = calculate_priority_score(inc, db)
        results.append({
            "id": inc.id,
            "report_code": inc.report_code,
            "lake_id": inc.lake_id,
            "lake_name": lake.name,
            "category_name": inc.category.name if inc.category else "Other",
            "category_color": inc.category.color_hex if inc.category else "#64748b",
            "severity": inc.severity.value,
            "status": inc.status.value,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "distance_meters": round(haversine_distance_meters(lake.latitude, lake.longitude, inc.latitude, inc.longitude), 1),
            "priority_score": priority,
            "description": inc.description,
            "created_at": inc.created_at,
        })
    return {
        "lake_id": lake.id,
        "lake_name": lake.name,
        "center": {"lat": lake.latitude, "lng": lake.longitude},
        "query_radius_meters": radius_meters,
        "incident_count": len(results),
        "incidents": results
    }

@router.get("/nearby-reports")
def get_reports_near_coordinates(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_meters: float = Query(1000.0, ge=50, le=10000),
    db: Session = Depends(get_db)
):
    """Spatial query returning incidents near user or clicked point."""
    incidents = find_incidents_within_radius(db, latitude, longitude, radius_meters)
    results = []
    for inc in incidents:
        dist = haversine_distance_meters(latitude, longitude, inc.latitude, inc.longitude)
        results.append({
            "id": inc.id,
            "report_code": inc.report_code,
            "lake_name": inc.lake.name if inc.lake else None,
            "category_name": inc.category.name if inc.category else None,
            "severity": inc.severity.value,
            "status": inc.status.value,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "distance_meters": round(dist, 1),
            "created_at": inc.created_at,
        })
    results.sort(key=lambda x: x["distance_meters"])
    return {
        "query_point": {"lat": latitude, "lng": longitude},
        "radius_meters": radius_meters,
        "count": len(results),
        "reports": results
    }

@router.get("/bounds-filter")
def get_incidents_in_bounds(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lng: float = Query(...),
    db: Session = Depends(get_db)
):
    """Filters incidents inside current interactive Leaflet map viewport bounds."""
    incidents = db.query(Incident).filter(
        Incident.latitude.between(min_lat, max_lat),
        Incident.longitude.between(min_lng, max_lng)
    ).all()

    return [{
        "id": i.id,
        "report_code": i.report_code,
        "lake_id": i.lake_id,
        "lake_name": i.lake.name if i.lake else None,
        "category_name": i.category.name if i.category else None,
        "category_color": i.category.color_hex if i.category else "#0ea5e9",
        "severity": i.severity.value,
        "status": i.status.value,
        "latitude": i.latitude,
        "longitude": i.longitude,
        "image_url": i.image_url,
        "created_at": i.created_at
    } for i in incidents]

@router.get("/lake-density-metrics")
def get_lake_incident_density(db: Session = Depends(get_db)):
    """Calculates incident density per hectare for each Coimbatore lake."""
    lakes = db.query(Lake).all()
    densities = []
    for lake in lakes:
        count = db.query(Incident).filter(Incident.lake_id == lake.id).count()
        area = lake.area_hectares or 20.0
        density_per_ha = round(count / area, 2)
        densities.append({
            "lake_id": lake.id,
            "lake_name": lake.name,
            "area_hectares": area,
            "total_incidents": count,
            "density_per_hectare": density_per_ha,
            "status": lake.status.value,
            "health_score": lake.platform_health_score
        })
    return densities
