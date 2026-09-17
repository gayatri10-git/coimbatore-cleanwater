import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.user import User, UserRole
from backend.app.models.lake import Lake
from backend.app.models.category import IssueCategory
from backend.app.models.incident import Incident, IncidentStatus, IncidentSeverity

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Coimbatore CleanWater" in data["service"]

def test_demo_login():
    # Test citizen login
    response = client.post("/api/auth/login", json={
        "email": "citizen@cleanh2o.demo",
        "password": "citizen123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "citizen"

    # Test staff login
    response_staff = client.post("/api/auth/login", json={
        "email": "staff@cleanh2o.demo",
        "password": "staff123"
    })
    assert response_staff.status_code == 200
    assert response_staff.json()["user"]["role"] == "staff"

def test_get_lakes():
    response = client.get("/api/lakes")
    assert response.status_code == 200
    lakes = response.json()
    assert len(lakes) >= 8
    lake_names = [l["name"] for l in lakes]
    assert "Ukkadam Lake" in lake_names
    assert "Valankulam Lake" in lake_names
    assert "Periyakulam" in lake_names
    assert "Singanallur Lake" in lake_names

def test_get_categories():
    response = client.get("/api/categories")
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) >= 8
    cat_names = [c["name"] for c in categories]
    assert any("Garbage" in name for name in cat_names)
    assert any("Sewage" in name for name in cat_names)

def test_analytics_overview():
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_lakes"] >= 8
    assert data["total_reports"] >= 100
    assert "resolution_rate_percent" in data
    assert "avg_resolution_hours" in data

def test_duplicate_check():
    # Query Ukkadam coordinates with category 1
    response = client.post("/api/incidents/check-duplicates?category_id=1&latitude=10.9925&longitude=76.9614&threshold_meters=1500")
    assert response.status_code == 200
    data = response.json()
    assert "has_duplicate" in data
    assert "existing_incidents" in data

def test_incident_lifecycle():
    # Login staff
    login_res = client.post("/api/auth/login", json={
        "email": "staff@cleanh2o.demo",
        "password": "staff123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create incident as citizen
    create_res = client.post("/api/incidents", json={
        "lake_id": 1,
        "category_id": 1,
        "description": "Test solid plastic debris spotted near the water inlet by community volunteer.",
        "severity": "HIGH",
        "latitude": 10.9930,
        "longitude": 76.9620
    })
    assert create_res.status_code == 201
    new_inc = create_res.json()
    inc_id = new_inc["id"]
    assert new_inc["report_code"].startswith("CW-2026-")
    assert new_inc["status"] == "PENDING"

    # 2. Staff assigns incident
    assign_res = client.post(f"/api/incidents/{inc_id}/assign", json={
        "assigned_to": login_res.json()["user"]["id"],
        "note": "Immediate field dispatch allocated."
    }, headers=headers)
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "ASSIGNED"

    # 3. Staff sets in progress
    prog_res = client.post(f"/api/incidents/{inc_id}/status", json={
        "status": "IN_PROGRESS",
        "note": "Field sanitization truck on site."
    }, headers=headers)
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "IN_PROGRESS"

    # 4. Resolve requires resolution note
    fail_res = client.post(f"/api/incidents/{inc_id}/status", json={
        "status": "RESOLVED",
        "resolution_note": ""
    }, headers=headers)
    assert fail_res.status_code == 400

    # 5. Resolve with valid resolution note
    resolve_res = client.post(f"/api/incidents/{inc_id}/status", json={
        "status": "RESOLVED",
        "resolution_note": "Plastic waste extracted and area cleared successfully."
    }, headers=headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"

    # 6. Verify audit history in incident details
    detail_res = client.get(f"/api/incidents/{inc_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["status_history"]) >= 4

if __name__ == "__main__":
    test_health_check()
    test_demo_login()
    test_get_lakes()
    test_get_categories()
    test_analytics_overview()
    test_duplicate_check()
    test_incident_lifecycle()
    print("ALL API TESTS PASSED SUCCESSFULLY!")
