import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.database.session import SessionLocal, engine, Base
from backend.app.models.user import User, UserRole
from backend.app.models.lake import Lake, LakeStatus
from backend.app.models.category import IssueCategory
from backend.app.models.incident import Incident, IncidentSeverity, IncidentStatus, IncidentStatusHistory
from backend.app.models.notification import Notification
from backend.app.auth.security import get_password_hash

# 8 Major Coimbatore Lakes with real GIS positions
COIMBATORE_LAKES = [
    {
        "name": "Ukkadam Lake",
        "description": "Also known as Periyakulam Ukkadam feeder, a historic Chola dynasty lake spread over 300+ acres, critical for groundwater recharge.",
        "latitude": 10.9925,
        "longitude": 76.9614,
        "area_hectares": 129.5,
        "perimeter_km": 5.8,
        "platform_health_score": 78,
        "status": LakeStatus.HEALTHY
    },
    {
        "name": "Valankulam Lake",
        "description": "Situated between Trichy Road and Sungam bypass; vital urban wetland home to migratory birds and recently rejuvenated lakefront promenade.",
        "latitude": 10.9972,
        "longitude": 76.9742,
        "area_hectares": 64.0,
        "perimeter_km": 4.2,
        "platform_health_score": 72,
        "status": LakeStatus.HEALTHY
    },
    {
        "name": "Periyakulam",
        "description": "The largest freshwater reservoir lake in Coimbatore city center featuring modern eco-restoration, floating wetlands, and leisure walkways.",
        "latitude": 10.9880,
        "longitude": 76.9530,
        "area_hectares": 135.0,
        "perimeter_km": 6.1,
        "platform_health_score": 85,
        "status": LakeStatus.HEALTHY
    },
    {
        "name": "Kurichi Lake",
        "description": "Expansive southern lake connected to the Noyyal river system; serves agricultural zones and rapidly expanding residential catchments.",
        "latitude": 10.9520,
        "longitude": 76.9690,
        "area_hectares": 138.0,
        "perimeter_km": 6.5,
        "platform_health_score": 58,
        "status": LakeStatus.WARNING
    },
    {
        "name": "Singanallur Lake",
        "description": "Declared a Biodiversity Heritage Site; hosts over 110 bird species, 390 plant species, and fragile marshland buffer zones.",
        "latitude": 10.9940,
        "longitude": 77.0210,
        "area_hectares": 115.3,
        "perimeter_km": 5.4,
        "platform_health_score": 64,
        "status": LakeStatus.WARNING
    },
    {
        "name": "Selvachinthamani Lake",
        "description": "Urban lake located near Perur bypass road, receiving canal inflows from Noyyal system, undergoing smart city desiltation.",
        "latitude": 11.0020,
        "longitude": 76.9490,
        "area_hectares": 28.2,
        "perimeter_km": 2.8,
        "platform_health_score": 60,
        "status": LakeStatus.WARNING
    },
    {
        "name": "Kumarasamy Lake",
        "description": "Popularly called Muthannankulam; prominent water body near Thadagam road surrounded by dense residential wards.",
        "latitude": 11.0110,
        "longitude": 76.9450,
        "area_hectares": 38.6,
        "perimeter_km": 3.1,
        "platform_health_score": 48,
        "status": LakeStatus.CRITICAL
    },
    {
        "name": "Krishnampathy Lake",
        "description": "Upstream lake on the Selvampathy feeder chain in west Coimbatore; crucial for storm water mitigation during North-East monsoons.",
        "latitude": 11.0180,
        "longitude": 76.9380,
        "area_hectares": 49.0,
        "perimeter_km": 3.7,
        "platform_health_score": 69,
        "status": LakeStatus.HEALTHY
    }
]

ISSUE_CATEGORIES = [
    {
        "name": "Garbage / Solid Waste",
        "code": "GARBAGE",
        "description": "Plastic trash, commercial packing waste, and domestic solid refuse accumulated on water edges.",
        "icon_name": "Trash2",
        "color_hex": "#ef4444"
    },
    {
        "name": "Sewage Inflow",
        "code": "SEWAGE",
        "description": "Untreated sewage outfall, greywater diversion, or leaking municipal drainage entering lake basin.",
        "icon_name": "Droplets",
        "color_hex": "#8b5cf6"
    },
    {
        "name": "Water Hyacinth / Excess Vegetation",
        "code": "HYACINTH",
        "description": "Dense mats of invasive Eichhornia crassipes or weed cover blocking sunlight and oxygen transfer.",
        "icon_name": "Flower2",
        "color_hex": "#10b981"
    },
    {
        "name": "Algal Bloom",
        "code": "ALGAE",
        "description": "Rapid micro-algal proliferation resulting in emerald discoloration, scum layer, or cyanobacteria crust.",
        "icon_name": "Waves",
        "color_hex": "#06b6d4"
    },
    {
        "name": "Foul Odour",
        "code": "ODOUR",
        "description": "Noxious hydrogen sulfide or anaerobic decomposition fumes reported by walking visitors or nearby residents.",
        "icon_name": "Wind",
        "color_hex": "#f59e0b"
    },
    {
        "name": "Illegal Dumping",
        "code": "DUMPING",
        "description": "Unauthorized nighttime dumping of building debris, industrial sludge, or construction rubble.",
        "icon_name": "AlertTriangle",
        "color_hex": "#dc2626"
    },
    {
        "name": "Drainage Issue",
        "code": "DRAINAGE",
        "description": "Blocked storm-water sluice, broken surplus weir, or canal siltation impeding gravity flow.",
        "icon_name": "GitBranch",
        "color_hex": "#6366f1"
    },
    {
        "name": "Damaged Infrastructure",
        "code": "DAMAGE",
        "description": "Cracked revetment stone walls, broken handrails, breached bund walkways, or faulty aeration aerators.",
        "icon_name": "Wrench",
        "color_hex": "#64748b"
    },
    {
        "name": "Other",
        "code": "OTHER",
        "description": "Miscellaneous environmental anomalies, dead fish spotting, or shoreline soil erosion.",
        "icon_name": "HelpCircle",
        "color_hex": "#94a3b8"
    }
]

DESCRIPTIONS_BY_CAT = {
    "GARBAGE": [
        "Heavy accumulation of plastic bags, thermocol plates, and PET bottles stranded along the eastern stone revetment.",
        "Commercial vegetable market packing refuse dumped near the lake sluice gate causing water stagnation.",
        "Multiple plastic bags floating near the pedestrian observation deck and caught in shoreline reeds.",
        "Disposed food containers and plastic bottles littering the lake walkway and shallow water shoreline."
    ],
    "SEWAGE": [
        "Direct black water discharge from untreated storm drain inlet pipe into the northern lake boundary.",
        "Foul sewage outflow visible entering lake waters with dark grey tint and oily surface sheen.",
        "Submerged municipal sewer pipe leak bubbling up near the south embankment, emitting pungent septic smell.",
        "Drainage overflow from nearby commercial settlement bypassing the bio-filter trench directly into open water."
    ],
    "HYACINTH": [
        "Invasive water hyacinth carpet has expanded across approximately 1.5 hectares of the western cove.",
        "Dense aquatic weed bloom blocking the surplus weir discharge channel and entrapping debris.",
        "Eichhornia proliferation completely covering the shallow feeder inlet, preventing water circulation.",
        "Overgrowth of wild aquatic grass spreading from the northern marsh area towards the main boat jetty."
    ],
    "ALGAE": [
        "Thick pea-soup green algal scum formed along 200 meters of the calm southern embankment.",
        "Extensive cyanobacterial surface bloom visible under sunlight with foul decomposition film.",
        "Micro-algae discoloration observed across the shallow littoral zone following recent warm temperature spike."
    ],
    "ODOUR": [
        "Strong hydrogen sulfide odour reported by morning joggers along the western lake bund promenade.",
        "Intense anaerobic stench noticeable up to 150 meters away from the lake inlet canal.",
        "Pungent organic decay smell emanating from decaying organic matter trapped in the shoreline silt."
    ],
    "DUMPING": [
        "Truckload of demolition concrete debris and broken tiles dumped on the lake buffer embankment overnight.",
        "Industrial packaging scraps and plastic chemical barrels dumped beside the access track leading to the water.",
        "Unauthorized construction soil fill encroaching into the high-flood line of the lake."
    ],
    "DRAINAGE": [
        "Inlet culvert blocked with compacted plastic and tree trunks, preventing natural monsoon inflow.",
        "Storm water channel breach spilling muddy silt run-off into the freshly desilted wetland cell.",
        "Lake surplus weir crest damaged with silt buildup blocking proper gravity discharge."
    ],
    "DAMAGE": [
        "Lake revetment stone pitching collapsed over a 12-meter stretch after heavy localized rain.",
        "Solar aeration bubbler unit detached from mooring and floating non-functional near the reed bed.",
        "Pedestrian protection handrail broken along the lakeside bund walkway posing safety risk."
    ],
    "OTHER": [
        "Small cluster of dead fingerling fish observed floating near the southern aeration inlet.",
        "Shoreline soil erosion threatening young saplings planted during recent eco-restoration drive.",
        "Unusual oily chemical film observed drifting across the surface near the northern bridge."
    ]
}

RESOLUTION_NOTES = [
    "Municipal sanitation crew deployed with floating trash skimmer; 450 kg of plastic waste removed and dispatched to Vellalore recycling facility.",
    "Engineers inspected the breached inlet pipe, plugged the illicit greywater connection, and reinforced the masonry bund wall.",
    "Eco-restoration contractor deployed weed harvester boat; 1.2 hectares of water hyacinth cleared and composted.",
    "Desiltation backhoe cleared the jammed inlet culvert and restored 100% gravity flow to the Noyyal feeder canal.",
    "Damaged granite revetment rebuilt with reinforced cement concrete; pedestrian barricades re-anchored.",
    "CCMC enforcement squad inspected the site, seized the unauthorized dumping vehicle, and cleared 2 truckloads of construction rubble.",
    "Aeration fountain repaired with new submerged impeller motor; dissolved oxygen levels restored in the localized bay."
]

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Lake).count() >= 8 and db.query(Incident).count() >= 100:
            print("Database is already seeded with lakes and 100+ incidents.")
            return

        print("Seeding Coimbatore CleanWater database...")

        # 1. Seed Roles & Users
        users_to_create = [
            {
                "email": "citizen@cleanh2o.demo",
                "password": "citizen123",
                "full_name": "Gayatri Tanisha Bitasta",
                "role": UserRole.CITIZEN,
                "phone": "+91 98421 11024"
            },
            {
                "email": "staff@cleanh2o.demo",
                "password": "staff123",
                "full_name": "Karthik Sundaram (AE, CCMC)",
                "role": UserRole.STAFF,
                "phone": "+91 94432 55890"
            },
            {
                "email": "admin@cleanh2o.demo",
                "password": "admin123",
                "full_name": "Dr. Ananya Murugan (Director, CCMC GIS)",
                "role": UserRole.ADMIN,
                "phone": "+91 94880 77123"
            },
            {
                "email": "officer.selvan@cleanh2o.demo",
                "password": "staff123",
                "full_name": "R. Selvan (Sanitation Inspector)",
                "role": UserRole.STAFF,
                "phone": "+91 98430 44210"
            },
            {
                "email": "officer.meera@cleanh2o.demo",
                "password": "staff123",
                "full_name": "Meera Natarajan (Lake Biologist)",
                "role": UserRole.STAFF,
                "phone": "+91 97890 33812"
            }
        ]

        created_users = {}
        for u in users_to_create:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    phone=u["phone"],
                    is_active=True
                )
                db.add(user)
                db.flush()
                created_users[u["email"]] = user
            else:
                created_users[u["email"]] = existing

        citizen_user = created_users["citizen@cleanh2o.demo"]
        staff_user = created_users["staff@cleanh2o.demo"]
        admin_user = created_users["admin@cleanh2o.demo"]
        staff_pool = [created_users[u["email"]] for u in users_to_create if u["role"] in [UserRole.STAFF, UserRole.ADMIN]]

        # 2. Seed Categories
        created_categories = {}
        for cat in ISSUE_CATEGORIES:
            existing = db.query(IssueCategory).filter(IssueCategory.code == cat["code"]).first()
            if not existing:
                category = IssueCategory(
                    name=cat["name"],
                    code=cat["code"],
                    description=cat["description"],
                    icon_name=cat["icon_name"],
                    color_hex=cat["color_hex"]
                )
                db.add(category)
                db.flush()
                created_categories[cat["code"]] = category
            else:
                created_categories[cat["code"]] = existing

        # 3. Seed 8 Major Coimbatore Lakes
        created_lakes = []
        for l in COIMBATORE_LAKES:
            existing = db.query(Lake).filter(Lake.name == l["name"]).first()
            if not existing:
                lake = Lake(
                    name=l["name"],
                    description=l["description"],
                    latitude=l["latitude"],
                    longitude=l["longitude"],
                    area_hectares=l["area_hectares"],
                    perimeter_km=l["perimeter_km"],
                    platform_health_score=l["platform_health_score"],
                    status=l["status"]
                )
                db.add(lake)
                db.flush()
                created_lakes.append(lake)
            else:
                created_lakes.append(existing)

        # 4. Seed 124 realistic Incidents (exceeding 100)
        random.seed(42)  # Deterministic realistic demo dataset
        severities = [
            IncidentSeverity.LOW,
            IncidentSeverity.MEDIUM,
            IncidentSeverity.MEDIUM,
            IncidentSeverity.HIGH,
            IncidentSeverity.HIGH,
            IncidentSeverity.CRITICAL
        ]
        statuses = [
            IncidentStatus.RESOLVED,
            IncidentStatus.RESOLVED,
            IncidentStatus.RESOLVED,
            IncidentStatus.CLOSED,
            IncidentStatus.IN_PROGRESS,
            IncidentStatus.ASSIGNED,
            IncidentStatus.PENDING,
            IncidentStatus.PENDING
        ]

        total_incidents_to_seed = 124
        current_date = datetime.utcnow()

        for idx in range(1, total_incidents_to_seed + 1):
            report_code = f"CW-2026-{idx:05d}"
            existing_inc = db.query(Incident).filter(Incident.report_code == report_code).first()
            if existing_inc:
                continue

            lake = random.choice(created_lakes)
            cat_code = random.choice(list(ISSUE_CATEGORIES))["code"]
            category = created_categories[cat_code]

            # Offset slightly from lake center (between 50m and 600m) to model actual shoreline spots
            lat_offset = random.uniform(-0.004, 0.004)
            lng_offset = random.uniform(-0.004, 0.004)
            inc_lat = round(lake.latitude + lat_offset, 6)
            inc_lng = round(lake.longitude + lng_offset, 6)

            severity = random.choice(severities)
            status = random.choice(statuses)

            # Date created between 1 and 90 days ago
            days_ago = random.randint(1, 90)
            created_time = current_date - timedelta(days=days_ago, hours=random.randint(1, 18), minutes=random.randint(0, 59))

            desc_list = DESCRIPTIONS_BY_CAT.get(cat_code, DESCRIPTIONS_BY_CAT["OTHER"])
            description = random.choice(desc_list)

            assigned_staff = random.choice(staff_pool) if status != IncidentStatus.PENDING else None

            resolved_time = None
            resolution_note = None
            if status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
                resolved_time = created_time + timedelta(days=random.randint(1, 5), hours=random.randint(2, 12))
                resolution_note = random.choice(RESOLUTION_NOTES)

            # Realistic placeholder image URLs matching lake environmental issues
            demo_images = [
                "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1563974318767-a4de855d7b43?w=800&auto=format&fit=crop&q=80"
            ]
            image_url = random.choice(demo_images)

            incident = Incident(
                report_code=report_code,
                user_id=citizen_user.id,
                lake_id=lake.id,
                category_id=category.id,
                description=description,
                severity=severity,
                status=status,
                latitude=inc_lat,
                longitude=inc_lng,
                location_wkt=f"POINT({inc_lng} {inc_lat})",
                image_url=image_url,
                created_at=created_time,
                updated_at=resolved_time or created_time,
                assigned_to=assigned_staff.id if assigned_staff else None,
                resolution_note=resolution_note,
                resolved_at=resolved_time
            )
            db.add(incident)
            db.flush()

            # Create realistic audit status history
            # 1. Submitted
            h1 = IncidentStatusHistory(
                incident_id=incident.id,
                old_status=None,
                new_status=IncidentStatus.PENDING,
                changed_by=citizen_user.id,
                note="Report registered via Citizen Mobile Web Portal",
                timestamp=created_time
            )
            db.add(h1)

            # 2. Assigned if status >= ASSIGNED
            if status in [IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
                assign_time = created_time + timedelta(hours=random.randint(2, 14))
                h2 = IncidentStatusHistory(
                    incident_id=incident.id,
                    old_status=IncidentStatus.PENDING,
                    new_status=IncidentStatus.ASSIGNED,
                    changed_by=admin_user.id,
                    note=f"Assigned to field officer {assigned_staff.full_name}",
                    timestamp=assign_time
                )
                db.add(h2)

            # 3. In Progress
            if status in [IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
                prog_time = created_time + timedelta(hours=random.randint(15, 36))
                h3 = IncidentStatusHistory(
                    incident_id=incident.id,
                    old_status=IncidentStatus.ASSIGNED,
                    new_status=IncidentStatus.IN_PROGRESS,
                    changed_by=assigned_staff.id,
                    note="On-site inspection initiated by field team",
                    timestamp=prog_time
                )
                db.add(h3)

            # 4. Resolved
            if status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
                h4 = IncidentStatusHistory(
                    incident_id=incident.id,
                    old_status=IncidentStatus.IN_PROGRESS,
                    new_status=IncidentStatus.RESOLVED,
                    changed_by=assigned_staff.id,
                    note=resolution_note,
                    timestamp=resolved_time
                )
                db.add(h4)

            # 5. Closed
            if status == IncidentStatus.CLOSED:
                close_time = resolved_time + timedelta(days=1)
                h5 = IncidentStatusHistory(
                    incident_id=incident.id,
                    old_status=IncidentStatus.RESOLVED,
                    new_status=IncidentStatus.CLOSED,
                    changed_by=admin_user.id,
                    note="Citizen verified & quality audit approved",
                    timestamp=close_time
                )
                db.add(h5)

        # 5. Seed in-app notifications
        sample_notifs = [
            {
                "user_id": citizen_user.id,
                "title": "Report CW-2026-00012 Assigned",
                "message": "Municipal supervisor has assigned your Ukkadam Lake debris report to Officer Selvan for urgent cleanup.",
                "type": "assignment",
                "is_read": False,
                "created_at": current_date - timedelta(hours=3)
            },
            {
                "user_id": citizen_user.id,
                "title": "Issue Resolved: Valankulam Water Hyacinth",
                "message": "Your report CW-2026-00004 has been marked RESOLVED. Weed skimmer boats cleared the inlet channel.",
                "type": "resolution",
                "is_read": True,
                "created_at": current_date - timedelta(days=1)
            },
            {
                "user_id": staff_user.id,
                "title": "3 High-Priority Incidents Require Attention",
                "message": "Critical sewage inflow and repeat garbage dumping reported around Singanallur Lake buffer.",
                "type": "warning",
                "is_read": False,
                "created_at": current_date - timedelta(hours=1)
            },
            {
                "user_id": admin_user.id,
                "title": "System Audit Alert",
                "message": "8 unresolved incidents across Kumarasamy Lake are older than 5 days. Priority escalation applied.",
                "type": "warning",
                "is_read": False,
                "created_at": current_date - timedelta(hours=6)
            }
        ]
        for n in sample_notifs:
            notif = Notification(
                user_id=n["user_id"],
                title=n["title"],
                message=n["message"],
                type=n["type"],
                is_read=n["is_read"],
                created_at=n["created_at"]
            )
            db.add(notif)

        db.commit()
        print(f"Successfully seeded database: 8 lakes, {total_incidents_to_seed} incidents, 5 user accounts, and initial notifications.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
