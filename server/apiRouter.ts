import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

const baseDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

const router = express.Router();

// Haversine distance
const EARTH_RADIUS_METERS = 6371000.0;
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const rLat1 = (lat1 * Math.PI) / 180.0;
  const rLat2 = (lat2 * Math.PI) / 180.0;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

// Data Store in memory with persistence
interface DBStore {
  users: any[];
  lakes: any[];
  issue_categories: any[];
  incidents: any[];
  incident_status_history: any[];
  notifications: any[];
}

function findSeedFile(): string {
  const candidates = [
    path.join(process.cwd(), "seed_db.json"),
    path.join(baseDir, "seed_db.json"),
    path.join(baseDir, "..", "seed_db.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(process.cwd(), "seed_db.json");
}

const SEED_FILE = findSeedFile();
let db: DBStore = {
  users: [],
  lakes: [],
  issue_categories: [],
  incidents: [],
  incident_status_history: [],
  notifications: [],
};

try {
  if (fs.existsSync(SEED_FILE)) {
    const raw = fs.readFileSync(SEED_FILE, "utf-8");
    db = JSON.parse(raw);
    console.log(
      `Loaded DB: ${db.lakes.length} lakes, ${db.incidents.length} incidents, ${db.issue_categories.length} categories, ${db.users.length} users (source: ${SEED_FILE})`
    );
  } else {
    console.warn("seed_db.json not found, initializing empty DB store");
  }
} catch (err) {
  console.error("Error reading seed_db.json:", err);
}

function persistDB() {
  try {
    fs.writeFileSync(SEED_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to persist seed_db.json (continuing in-memory):", e);
  }
}

// Photo Upload Setup with resilient path resolution
function findUploadDir(): string {
  const candidates = [
    path.join(process.cwd(), "uploads"),
    path.join(baseDir, "uploads"),
    path.join(baseDir, "..", "uploads"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  const defaultDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch {}
  }
  return defaultDir;
}

const uploadDir = findUploadDir();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const uniqueName = `incident_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Helper: user formatting
function formatUser(u: any) {
  return {
    id: Number(u.id),
    email: u.email,
    full_name: u.full_name,
    role: (u.role || "citizen").toLowerCase(),
    phone: u.phone,
    is_active: Boolean(u.is_active),
    created_at: u.created_at || new Date().toISOString(),
  };
}

// Auth Middleware: extract user from Bearer token
function getAuthUser(req: Request): any | null {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (decoded && decoded.id) {
      const found = db.users.find((u) => Number(u.id) === Number(decoded.id));
      if (found) return found;
    }
  } catch {
    // If not base64 json, try matching email or token string
  }

  // Fallback: check if token matches user email
  const match = db.users.find((u) => u.email === token);
  if (match) return match;

  // Default to citizen user if token is present
  return db.users[0] || null;
}

// Helper: priority score
function calculatePriority(inc: any) {
  const baseScores: Record<string, number> = {
    CRITICAL: 100,
    HIGH: 75,
    MEDIUM: 50,
    LOW: 25,
  };
  const severityStr = (inc.severity || "MEDIUM").toUpperCase();
  let score = baseScores[severityStr] || 50;
  const reasons: string[] = [`${severityStr} severity baseline (${score} pts)`];

  const unresolved = ["PENDING", "ASSIGNED", "IN_PROGRESS"].includes((inc.status || "").toUpperCase());
  if (unresolved) {
    const createdDate = new Date(inc.created_at || Date.now());
    const ageDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 3600 * 24));
    if (ageDays > 0) {
      const agePts = Math.min(ageDays * 5, 25);
      score += agePts;
      reasons.push(`Reported ${ageDays} day${ageDays > 1 ? "s" : ""} ago (+${agePts} pts)`);
    }

    // Nearby cluster
    const cluster = db.incidents.filter((other) => {
      if (other.id === inc.id) return false;
      if (!["PENDING", "ASSIGNED", "IN_PROGRESS"].includes((other.status || "").toUpperCase())) return false;
      const d = haversineDistanceMeters(inc.latitude, inc.longitude, other.latitude, other.longitude);
      return d <= 500;
    });

    if (cluster.length > 0) {
      const clusterPts = Math.min(cluster.length * 8, 30);
      score += clusterPts;
      reasons.push(
        `${cluster.length} similar unresolved report${cluster.length > 1 ? "s" : ""} within 500m (+${clusterPts} pts)`
      );
    }
  }

  return {
    priority_score: Math.min(Math.max(score, 10), 100),
    priority_reasons: reasons,
  };
}

// Helper: format incident
function formatIncident(inc: any) {
  const lake = db.lakes.find((l) => Number(l.id) === Number(inc.lake_id));
  const category = db.issue_categories.find((c) => Number(c.id) === Number(inc.category_id));
  const assignee = inc.assigned_to ? db.users.find((u) => Number(u.id) === Number(inc.assigned_to)) : null;
  const { priority_score, priority_reasons } = calculatePriority(inc);

  return {
    id: Number(inc.id),
    report_code: inc.report_code,
    user_id: Number(inc.user_id),
    lake_id: Number(inc.lake_id),
    lake_name: lake ? lake.name : "Unknown Lake",
    category_id: Number(inc.category_id),
    category_name: category ? category.name : "General",
    category_color: category ? category.color_hex : "#64748b",
    description: inc.description || "",
    severity: (inc.severity || "MEDIUM").toUpperCase(),
    status: (inc.status || "PENDING").toUpperCase(),
    latitude: Number(inc.latitude),
    longitude: Number(inc.longitude),
    image_url: inc.image_url || undefined,
    created_at: inc.created_at || new Date().toISOString(),
    updated_at: inc.updated_at || inc.created_at || new Date().toISOString(),
    assigned_to: inc.assigned_to ? Number(inc.assigned_to) : undefined,
    assignee_name: assignee ? assignee.full_name : undefined,
    resolution_note: inc.resolution_note || undefined,
    resolved_at: inc.resolved_at || undefined,
    priority_score,
    priority_reasons,
  };
}

// Recalculate lake health score
function computeLakeHealth(lakeId: number) {
  const lakeIncidents = db.incidents.filter((i) => Number(i.lake_id) === Number(lakeId));
  const active = lakeIncidents.filter((i) =>
    ["PENDING", "ASSIGNED", "IN_PROGRESS"].includes((i.status || "").toUpperCase())
  );
  const resolved = lakeIncidents.filter((i) =>
    ["RESOLVED", "CLOSED"].includes((i.status || "").toUpperCase())
  );

  let penalty = 0;
  for (const inc of active) {
    const sev = (inc.severity || "MEDIUM").toUpperCase();
    if (sev === "CRITICAL") penalty += 15;
    else if (sev === "HIGH") penalty += 10;
    else if (sev === "MEDIUM") penalty += 5;
    else penalty += 2;
  }
  const bonus = Math.min(resolved.length * 2, 10);
  const score = Math.max(Math.min(100 - penalty + bonus, 100), 20);

  let status = "healthy";
  if (score < 50) status = "critical";
  else if (score < 80) status = "warning";

  return {
    score,
    status,
    active_issue_count: active.length,
    resolved_issue_count: resolved.length,
    total_issue_count: active.length + resolved.length,
  };
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check
router.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "Coimbatore CleanWater API",
    version: "1.0.0",
    platform: "Express + Node.js + Spatial GIS",
  });
});

// Auth: Register
router.post("/auth/register", (req, res) => {
  const { email, password, full_name, phone } = req.body;
  if (!email || !full_name) {
    return res.status(400).json({ detail: "Email and full name are required." });
  }
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ detail: "A user with this email address already exists." });
  }

  const newId = db.users.length ? Math.max(...db.users.map((u) => Number(u.id))) + 1 : 1;
  const newUser = {
    id: newId,
    email,
    hashed_password: password || "demo123",
    full_name,
    role: "CITIZEN",
    phone: phone || "",
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.users.push(newUser);
  persistDB();

  const token = Buffer.from(JSON.stringify({ id: newUser.id, role: newUser.role, time: Date.now() })).toString("base64");
  return res.status(201).json({
    access_token: token,
    token_type: "bearer",
    user: formatUser(newUser),
  });
});

// Auth: Login
router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ detail: "Email is required." });
  }
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ detail: "Invalid email or password." });
  }

  // Demo user credentials check
  const validDemoPass: Record<string, string> = {
    "citizen@cleanh2o.demo": "citizen123",
    "staff@cleanh2o.demo": "staff123",
    "admin@cleanh2o.demo": "admin123",
    "officer.selvan@cleanh2o.demo": "staff123",
    "officer.meera@cleanh2o.demo": "staff123",
  };
  if (validDemoPass[user.email.toLowerCase()] && password && password !== validDemoPass[user.email.toLowerCase()]) {
    return res.status(401).json({ detail: "Invalid email or password." });
  }

  const token = Buffer.from(JSON.stringify({ id: user.id, role: user.role, time: Date.now() })).toString("base64");
  return res.json({
    access_token: token,
    token_type: "bearer",
    user: formatUser(user),
  });
});

// Auth: Current Profile
router.get("/auth/me", (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  if (!user) {
    return res.status(401).json({ detail: "Not authenticated" });
  }
  return res.json(formatUser(user));
});

// Auth: Staff Members
router.get("/auth/staff-members", (_req, res) => {
  const staff = db.users.filter((u) => ["STAFF", "ADMIN"].includes((u.role || "").toUpperCase()));
  return res.json(staff.map(formatUser));
});

// Lakes: All
router.get("/lakes", (_req, res) => {
  const results = db.lakes.map((lake) => {
    const { score, status, active_issue_count, resolved_issue_count, total_issue_count } = computeLakeHealth(lake.id);
    return {
      id: Number(lake.id),
      name: lake.name,
      description: lake.description,
      latitude: Number(lake.latitude),
      longitude: Number(lake.longitude),
      area_hectares: Number(lake.area_hectares),
      perimeter_km: Number(lake.perimeter_km),
      platform_health_score: score,
      status,
      boundary_geojson: lake.boundary_geojson,
      created_at: lake.created_at || new Date().toISOString(),
      active_issue_count,
      resolved_issue_count,
      total_issue_count,
    };
  });
  return res.json(results);
});

// Lakes: By ID
router.get("/lakes/:id", (req, res) => {
  const lake = db.lakes.find((l) => Number(l.id) === Number(req.params.id));
  if (!lake) {
    return res.status(404).json({ detail: "Lake not found" });
  }
  const { score, status, active_issue_count, resolved_issue_count, total_issue_count } = computeLakeHealth(lake.id);
  return res.json({
    id: Number(lake.id),
    name: lake.name,
    description: lake.description,
    latitude: Number(lake.latitude),
    longitude: Number(lake.longitude),
    area_hectares: Number(lake.area_hectares),
    perimeter_km: Number(lake.perimeter_km),
    platform_health_score: score,
    status,
    boundary_geojson: lake.boundary_geojson,
    created_at: lake.created_at || new Date().toISOString(),
    active_issue_count,
    resolved_issue_count,
    total_issue_count,
  });
});

// Lakes: Statistics
router.get("/lakes/:id/statistics", (req, res) => {
  const lake = db.lakes.find((l) => Number(l.id) === Number(req.params.id));
  if (!lake) {
    return res.status(404).json({ detail: "Lake not found" });
  }
  const lakeIncidents = db.incidents.filter((i) => Number(i.lake_id) === Number(lake.id));
  const { score, status, active_issue_count, resolved_issue_count, total_issue_count } = computeLakeHealth(lake.id);

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const inc of lakeIncidents) {
    const cat = db.issue_categories.find((c) => Number(c.id) === Number(inc.category_id));
    const name = cat ? cat.name : "Other";
    categoryCounts[name] = (categoryCounts[name] || 0) + 1;
  }

  // Severity breakdown
  const severityCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const inc of lakeIncidents) {
    const s = (inc.severity || "MEDIUM").toUpperCase();
    severityCounts[s] = (severityCounts[s] || 0) + 1;
  }

  const resolution_rate = total_issue_count > 0 ? Math.round((resolved_issue_count / total_issue_count) * 100) : 100;

  return res.json({
    lake_id: Number(lake.id),
    lake_name: lake.name,
    health_score: score,
    status,
    total_issues: total_issue_count,
    active_issues: active_issue_count,
    resolved_issues: resolved_issue_count,
    resolution_rate,
    category_breakdown: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })),
    severity_breakdown: severityCounts,
  });
});

// Categories
router.get("/categories", (_req, res) => {
  const results = db.issue_categories.map((c) => ({
    id: Number(c.id),
    name: c.name,
    code: c.code,
    description: c.description,
    icon_name: c.icon_name,
    color_hex: c.color_hex,
    created_at: c.created_at || new Date().toISOString(),
  }));
  return res.json(results);
});

// Incidents: List
router.get("/incidents", (req, res) => {
  let list = [...db.incidents];

  if (req.query.lake_id) {
    list = list.filter((i) => Number(i.lake_id) === Number(req.query.lake_id));
  }
  if (req.query.category_id) {
    list = list.filter((i) => Number(i.category_id) === Number(req.query.category_id));
  }
  if (req.query.user_id) {
    list = list.filter((i) => Number(i.user_id) === Number(req.query.user_id));
  }
  if (req.query.assigned_to) {
    list = list.filter((i) => Number(i.assigned_to) === Number(req.query.assigned_to));
  }
  if (req.query.severity && req.query.severity !== "all") {
    list = list.filter((i) => (i.severity || "").toUpperCase() === String(req.query.severity).toUpperCase());
  }
  if (req.query.status && req.query.status !== "all") {
    list = list.filter((i) => (i.status || "").toUpperCase() === String(req.query.status).toUpperCase());
  }
  if (req.query.search) {
    const term = String(req.query.search).toLowerCase();
    list = list.filter(
      (i) => (i.report_code && i.report_code.toLowerCase().includes(term)) || (i.description && i.description.toLowerCase().includes(term))
    );
  }

  // Sorting
  const sortBy = req.query.sort_by || "newest";
  if (sortBy === "newest") {
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortBy === "priority") {
    list.sort((a, b) => calculatePriority(b).priority_score - calculatePriority(a).priority_score);
  } else if (sortBy === "severity") {
    const sevRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    list.sort((a, b) => (sevRank[(b.severity || "").toUpperCase()] || 0) - (sevRank[(a.severity || "").toUpperCase()] || 0));
  }

  const offset = Number(req.query.offset) || 0;
  const limit = Number(req.query.limit) || 100;
  const paginated = list.slice(offset, offset + limit);

  return res.json(paginated.map(formatIncident));
});

// Incidents: Check Duplicates
router.post("/incidents/check-duplicates", (req, res) => {
  const category_id = Number(req.query.category_id || req.body?.category_id);
  const latitude = Number(req.query.latitude || req.body?.latitude);
  const longitude = Number(req.query.longitude || req.body?.longitude);
  const threshold_meters = Number(req.query.threshold_meters || req.body?.threshold_meters || 200);

  const duplicates = db.incidents.filter((inc) => {
    if (Number(inc.category_id) !== category_id) return false;
    if (!["PENDING", "ASSIGNED", "IN_PROGRESS"].includes((inc.status || "").toUpperCase())) return false;
    const dist = haversineDistanceMeters(latitude, longitude, inc.latitude, inc.longitude);
    return dist <= threshold_meters;
  });

  const formatted = duplicates.map(formatIncident);
  const has_duplicate = formatted.length > 0;
  const message = has_duplicate
    ? `Found ${formatted.length} similar unresolved report(s) within ${Math.round(threshold_meters)}m.`
    : "No duplicate unresolved reports found nearby.";

  return res.json({
    has_duplicate,
    duplicate_count: formatted.length,
    message,
    existing_incidents: formatted,
  });
});

// Incidents: Upload Photo
router.post("/incidents/upload-photo", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: "No image file provided." });
  }
  return res.json({
    image_url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
  });
});

// Incidents: Create
router.post("/incidents", (req, res) => {
  const currentUser = getAuthUser(req) || db.users[0];
  const userId = currentUser ? currentUser.id : 1;
  const { lake_id, category_id, description, severity, latitude, longitude, image_url } = req.body;

  const year = new Date().getFullYear();
  const count = db.incidents.length + 1;
  const report_code = `CW-${year}-${String(count).padStart(5, "0")}`;

  const newIncident = {
    id: count,
    report_code,
    user_id: userId,
    lake_id: Number(lake_id),
    category_id: Number(category_id),
    description: description || "",
    severity: (severity || "MEDIUM").toUpperCase(),
    status: "PENDING",
    latitude: Number(latitude),
    longitude: Number(longitude),
    image_url: image_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assigned_to: null,
    resolution_note: null,
    resolved_at: null,
  };

  db.incidents.unshift(newIncident);

  // Status history
  const historyId = db.incident_status_history.length + 1;
  db.incident_status_history.push({
    id: historyId,
    incident_id: newIncident.id,
    old_status: null,
    new_status: "PENDING",
    changed_by: userId,
    note: "Incident report submitted by citizen",
    timestamp: new Date().toISOString(),
  });

  // Notification
  const notifId = db.notifications.length + 1;
  db.notifications.unshift({
    id: notifId,
    user_id: userId,
    incident_id: newIncident.id,
    title: "Report Submitted",
    message: `Your environmental report ${newIncident.report_code} has been registered and queued for municipal inspection.`,
    type: "info",
    is_read: 0,
    created_at: new Date().toISOString(),
  });

  persistDB();
  return res.status(201).json(formatIncident(newIncident));
});

// Incidents: Details by ID
router.get("/incidents/:id", (req, res) => {
  const incident = db.incidents.find((i) => Number(i.id) === Number(req.params.id));
  if (!incident) {
    return res.status(404).json({ detail: "Incident report not found." });
  }

  const base = formatIncident(incident);
  const reporter = db.users.find((u) => Number(u.id) === Number(incident.user_id));
  const assignee = incident.assigned_to ? db.users.find((u) => Number(u.id) === Number(incident.assigned_to)) : null;
  const history = db.incident_status_history
    .filter((h) => Number(h.incident_id) === Number(incident.id))
    .map((h) => {
      const changer = h.changed_by ? db.users.find((u) => Number(u.id) === Number(h.changed_by)) : null;
      return {
        id: Number(h.id),
        incident_id: Number(h.incident_id),
        old_status: h.old_status,
        new_status: h.new_status,
        changed_by: h.changed_by,
        changer_name: changer ? changer.full_name : "System",
        note: h.note,
        timestamp: h.timestamp,
      };
    });

  return res.json({
    ...base,
    reporter: reporter ? formatUser(reporter) : undefined,
    assignee: assignee ? formatUser(assignee) : undefined,
    status_history: history,
  });
});

// Incidents: Assign
router.post("/incidents/:id/assign", (req, res) => {
  const incident = db.incidents.find((i) => Number(i.id) === Number(req.params.id));
  if (!incident) {
    return res.status(404).json({ detail: "Incident not found" });
  }

  const { assigned_to, note } = req.body;
  const staff = db.users.find((u) => Number(u.id) === Number(assigned_to));
  if (!staff) {
    return res.status(400).json({ detail: "Assigned staff member not found" });
  }

  const oldStatus = incident.status;
  incident.assigned_to = staff.id;
  incident.status = "ASSIGNED";
  incident.updated_at = new Date().toISOString();

  // History
  db.incident_status_history.push({
    id: db.incident_status_history.length + 1,
    incident_id: incident.id,
    old_status: oldStatus,
    new_status: "ASSIGNED",
    changed_by: staff.id,
    note: note || `Assigned to ${staff.full_name}`,
    timestamp: new Date().toISOString(),
  });

  // Notification to assignee
  db.notifications.unshift({
    id: db.notifications.length + 1,
    user_id: staff.id,
    incident_id: incident.id,
    title: "Incident Assigned",
    message: `You have been assigned to investigate report ${incident.report_code}.`,
    type: "assignment",
    is_read: 0,
    created_at: new Date().toISOString(),
  });

  persistDB();
  return res.json(formatIncident(incident));
});

// Incidents: Status Update
router.post("/incidents/:id/status", (req, res) => {
  const incident = db.incidents.find((i) => Number(i.id) === Number(req.params.id));
  if (!incident) {
    return res.status(404).json({ detail: "Incident not found" });
  }

  const { status, note, resolution_note } = req.body;
  const oldStatus = incident.status;
  const newStatus = (status || "IN_PROGRESS").toUpperCase();

  incident.status = newStatus;
  incident.updated_at = new Date().toISOString();
  if (resolution_note) {
    incident.resolution_note = resolution_note;
  }
  if (["RESOLVED", "CLOSED"].includes(newStatus) && !incident.resolved_at) {
    incident.resolved_at = new Date().toISOString();
  }

  // History
  db.incident_status_history.push({
    id: db.incident_status_history.length + 1,
    incident_id: incident.id,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: incident.assigned_to || 2,
    note: note || resolution_note || `Status updated to ${newStatus}`,
    timestamp: new Date().toISOString(),
  });

  // Notification to reporter
  if (incident.user_id) {
    db.notifications.unshift({
      id: db.notifications.length + 1,
      user_id: incident.user_id,
      incident_id: incident.id,
      title: `Incident ${newStatus}`,
      message: `Your report ${incident.report_code} status has been updated to ${newStatus}.`,
      type: "update",
      is_read: 0,
      created_at: new Date().toISOString(),
    });
  }

  persistDB();
  return res.json(formatIncident(incident));
});

// GIS: Lake nearby incidents
router.get("/gis/lake/:id/incidents-within-radius", (req, res) => {
  const lake = db.lakes.find((l) => Number(l.id) === Number(req.params.id));
  if (!lake) {
    return res.status(404).json({ detail: "Lake not found" });
  }
  const radiusMeters = Number(req.query.radius_meters) || 1500;

  const nearby = db.incidents
    .map((inc) => {
      const dist = haversineDistanceMeters(lake.latitude, lake.longitude, inc.latitude, inc.longitude);
      return { inc, dist };
    })
    .filter((item) => item.dist <= radiusMeters);

  const results = nearby.map(({ inc, dist }) => {
    const formatted = formatIncident(inc);
    return {
      ...formatted,
      distance_meters: Math.round(dist * 10) / 10,
    };
  });

  return res.json({
    lake_id: Number(lake.id),
    lake_name: lake.name,
    center: { lat: Number(lake.latitude), lng: Number(lake.longitude) },
    query_radius_meters: radiusMeters,
    incident_count: results.length,
    incidents: results,
  });
});

// GIS: Reports near coordinates
router.get("/gis/nearby-reports", (req, res) => {
  const lat = Number(req.query.latitude);
  const lng = Number(req.query.longitude);
  const radius = Number(req.query.radius_meters) || 1000;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ detail: "latitude and longitude query parameters are required" });
  }

  const reports = db.incidents
    .map((inc) => {
      const dist = haversineDistanceMeters(lat, lng, inc.latitude, inc.longitude);
      return { inc, dist };
    })
    .filter((item) => item.dist <= radius)
    .sort((a, b) => a.dist - b.dist)
    .map(({ inc, dist }) => {
      const lake = db.lakes.find((l) => Number(l.id) === Number(inc.lake_id));
      const cat = db.issue_categories.find((c) => Number(c.id) === Number(inc.category_id));
      return {
        id: Number(inc.id),
        report_code: inc.report_code,
        lake_name: lake ? lake.name : null,
        category_name: cat ? cat.name : null,
        severity: (inc.severity || "MEDIUM").toUpperCase(),
        status: (inc.status || "PENDING").toUpperCase(),
        latitude: Number(inc.latitude),
        longitude: Number(inc.longitude),
        distance_meters: Math.round(dist * 10) / 10,
        created_at: inc.created_at,
      };
    });

  return res.json({
    query_point: { lat, lng },
    radius_meters: radius,
    count: reports.length,
    reports,
  });
});

// Analytics: Overview
router.get("/analytics/overview", (_req, res) => {
  const total = db.incidents.length;
  const pending = db.incidents.filter((i) => (i.status || "").toUpperCase() === "PENDING").length;
  const in_progress = db.incidents.filter((i) =>
    ["ASSIGNED", "IN_PROGRESS"].includes((i.status || "").toUpperCase())
  ).length;
  const resolved = db.incidents.filter((i) =>
    ["RESOLVED", "CLOSED"].includes((i.status || "").toUpperCase())
  ).length;
  const closed = db.incidents.filter((i) => (i.status || "").toUpperCase() === "CLOSED").length;

  const resolution_rate_percent = total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0.0;

  const critical_unresolved = db.incidents.filter(
    (i) =>
      (i.severity || "").toUpperCase() === "CRITICAL" &&
      ["PENDING", "ASSIGNED", "IN_PROGRESS"].includes((i.status || "").toUpperCase())
  ).length;

  const high_unresolved = db.incidents.filter(
    (i) =>
      (i.severity || "").toUpperCase() === "HIGH" &&
      ["PENDING", "ASSIGNED", "IN_PROGRESS"].includes((i.status || "").toUpperCase())
  ).length;

  return res.json({
    total_lakes: db.lakes.length,
    total_reports: total,
    pending_reports: pending,
    in_progress_reports: in_progress,
    resolved_reports: resolved,
    closed_reports: closed,
    resolution_rate_percent,
    avg_resolution_hours: 28.5,
    critical_unresolved_count: critical_unresolved,
    high_unresolved_count: high_unresolved,
    disclaimer: "Platform demonstration operational metrics for Coimbatore lake conservation.",
  });
});

// Analytics: Lakes Comparison
router.get("/analytics/lakes", (_req, res) => {
  const results = db.lakes.map((lake) => {
    const lIncs = db.incidents.filter((i) => Number(i.lake_id) === Number(lake.id));
    const tot = lIncs.length;
    const pend = lIncs.filter((i) => (i.status || "").toUpperCase() === "PENDING").length;
    const inProg = lIncs.filter((i) =>
      ["ASSIGNED", "IN_PROGRESS"].includes((i.status || "").toUpperCase())
    ).length;
    const resCount = lIncs.filter((i) =>
      ["RESOLVED", "CLOSED"].includes((i.status || "").toUpperCase())
    ).length;
    const rate = tot > 0 ? Math.round((resCount / tot) * 1000) / 10 : 100.0;
    const { score, status } = computeLakeHealth(lake.id);

    return {
      id: Number(lake.id),
      name: lake.name,
      health_score: score,
      status,
      total: tot,
      pending: pend,
      in_progress: inProg,
      resolved: resCount,
      resolution_rate: rate,
      area_hectares: Number(lake.area_hectares),
    };
  });
  return res.json(results);
});

// Analytics: Categories
router.get("/analytics/categories", (_req, res) => {
  const results = db.issue_categories.map((cat) => {
    const count = db.incidents.filter((i) => Number(i.category_id) === Number(cat.id)).length;
    return {
      id: Number(cat.id),
      name: cat.name,
      code: cat.code,
      count,
      color: cat.color_hex,
    };
  });
  return res.json(results);
});

// Analytics: Trends
router.get("/analytics/trends", (_req, res) => {
  const trendMap: Record<string, { month: string; reported: number; resolved: number }> = {};
  for (const inc of db.incidents) {
    const date = new Date(inc.created_at || Date.now());
    const monthStr = date.toLocaleString("en-US", { month: "short", year: "numeric" });
    if (!trendMap[monthStr]) {
      trendMap[monthStr] = { month: monthStr, reported: 0, resolved: 0 };
    }
    trendMap[monthStr].reported += 1;
    if (["RESOLVED", "CLOSED"].includes((inc.status || "").toUpperCase())) {
      trendMap[monthStr].resolved += 1;
    }
  }
  return res.json(Object.values(trendMap));
});

// Analytics: Hotspots
router.get("/analytics/hotspots", (_req, res) => {
  const severityIntensity: Record<string, number> = {
    CRITICAL: 1.0,
    HIGH: 0.8,
    MEDIUM: 0.5,
    LOW: 0.3,
  };

  const points = db.incidents.map((inc) => {
    const lake = db.lakes.find((l) => Number(l.id) === Number(inc.lake_id));
    const cat = db.issue_categories.find((c) => Number(c.id) === Number(inc.category_id));
    let intensity = severityIntensity[(inc.severity || "MEDIUM").toUpperCase()] || 0.5;
    if (["PENDING", "ASSIGNED", "IN_PROGRESS"].includes((inc.status || "").toUpperCase())) {
      intensity = Math.min(intensity * 1.15, 1.0);
    }
    return {
      id: Number(inc.id),
      latitude: Number(inc.latitude),
      longitude: Number(inc.longitude),
      severity: (inc.severity || "MEDIUM").toUpperCase(),
      intensity: Math.round(intensity * 100) / 100,
      lake_name: lake ? lake.name : "Unknown",
      category_name: cat ? cat.name : "General",
      status: (inc.status || "PENDING").toUpperCase(),
      report_code: inc.report_code,
    };
  });

  return res.json(points);
});

// Notifications
router.get("/notifications", (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  const notifs = db.notifications
    .filter((n) => Number(n.user_id) === Number(user.id))
    .slice(0, 50)
    .map((n) => ({
      id: Number(n.id),
      user_id: Number(n.user_id),
      incident_id: n.incident_id ? Number(n.incident_id) : undefined,
      title: n.title,
      message: n.message,
      type: n.type || "info",
      is_read: Boolean(n.is_read),
      created_at: n.created_at || new Date().toISOString(),
    }));
  return res.json(notifs);
});

// Notifications: Mark read
router.patch("/notifications/:id/read", (req, res) => {
  const notif = db.notifications.find((n) => Number(n.id) === Number(req.params.id));
  if (!notif) {
    return res.status(404).json({ detail: "Notification not found." });
  }
  notif.is_read = 1;
  persistDB();
  return res.json({
    id: Number(notif.id),
    user_id: Number(notif.user_id),
    incident_id: notif.incident_id ? Number(notif.incident_id) : undefined,
    title: notif.title,
    message: notif.message,
    type: notif.type || "info",
    is_read: true,
    created_at: notif.created_at,
  });
});

// Notifications: Mark all read
router.post("/notifications/mark-all-read", (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  for (const n of db.notifications) {
    if (Number(n.user_id) === Number(user.id)) {
      n.is_read = 1;
    }
  }
  persistDB();
  return res.json({ status: "ok", message: "All notifications marked as read" });
});

export default router;
