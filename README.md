# Coimbatore CleanWater - Community GIS & Lake Monitoring Platform

A full-stack, citizen-powered spatial GIS platform for reporting, monitoring, and managing urban lake environmental issues across the Noyyal River basin in Coimbatore, Tamil Nadu.

---

## 🌟 Features & Personas

- **🌿 Citizen Lake Guardian Portal (`/citizen`)**:
  - Persona: **Gayatri Tanisha Bitasta** (Resident of Ukkadam & Morning Lake Walker)
  - Submit geo-tagged incident reports with GPS coordinates, photos, severity ratings, and lake selection.
  - Automatic 200-meter duplicate detection warning to prevent redundant reports.
  - Track remediation progress and view municipal cleanup notes.

- **🛠️ Municipal Field Operations Workstation (`/staff`)**:
  - Persona: **Karthik Sundaram, AE** (Assistant Engineer, CCMC Lakes Division)
  - Interactive Kanban board to manage work orders across **Pending**, **Assigned**, **In Progress**, and **Resolved**.
  - One-click work order claiming, status updating, and resolution logging with post-cleanup documentation.

- **🏛️ GIS Executive Command Center (`/admin`)**:
  - Persona: **Dr. Ananya Murugan** (Director, Municipal GIS & Urban Hydrology)
  - City-wide lake health index and water spread matrix for all 8 urban wetlands.
  - Interactive staff dispatching and priority escalation queue.
  - Comprehensive analytics, GIS heatmap, and incident trend visualizers.

- **🗺️ Interactive GIS Map (`/map`)**:
  - OpenStreetMap & Leaflet mapping engine with live incident markers, status-based coloring, radius clustering, and lake boundary views.

---

## 🚀 Quick Start (Local Machine)

### Prerequisites
- **Node.js**: version `18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: version `9.0.0` or higher (comes bundled with Node.js)

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Application
Compiles the React frontend via Vite and bundles the backend server with esbuild:
```bash
npm run build
```

### 3. Start the Server
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

> **For Development with Hot Reloading:**
> ```bash
> npm run dev
> ```
> This launches the server with Vite middleware on `http://localhost:3000`.

---

## 🐳 Running with Docker

You can run the entire platform with Docker in one command:

### Using Docker Compose
```bash
docker compose up --build
```

### Or Using Standard Docker
```bash
# Build the Docker container image
docker build -t coimbatore-cleanwater .

# Run the container on port 3000
docker run -p 3000:3000 coimbatore-cleanwater
```
Open **http://localhost:3000** in your browser.

---

## ☁️ Cloud Deployment Guides

### Option 1: Render / Railway / Heroku
1. Connect your repository or upload the downloaded code folder.
2. Configure settings:
   - **Environment**: Node.js
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: `3000` (or leave default if the platform sets port mapping)
3. Deploy! The health check endpoint is available at `/health` or `/api/health`.

### Option 2: Google Cloud Run / AWS App Runner / Azure Container Apps
1. Build and push the included `Dockerfile` directly:
   ```bash
   gcloud run deploy coimbatore-cleanwater --source . --port 3000 --allow-unauthenticated
   ```
2. The platform will automatically recognize the `Dockerfile` and boot on port 3000.

### Option 3: Traditional Linux VPS (Ubuntu / Debian / PM2)
```bash
# Clone or upload the project
git clone <your-repo> && cd <your-repo>

# Install and build
npm install
npm run build

# Start using PM2 process manager
npm install -g pm2
pm2 start dist/server.cjs --name "cleanwater"

# Enable start on system boot
pm2 startup
pm2 save
```

---

## 🔑 Pre-Configured Demo Accounts

You can switch personas at any time using the **"Switch Persona"** menu in the top navigation bar, or log in with these credentials:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Citizen** | **Gayatri Tanisha Bitasta** | `citizen@cleanh2o.demo` | `citizen123` |
| **Field Staff** | **Karthik Sundaram, AE** | `staff@cleanh2o.demo` | `staff123` |
| **GIS Admin** | **Dr. Ananya Murugan** | `admin@cleanh2o.demo` | `admin123` |
| **Inspector** | **R. Selvan** | `officer.selvan@cleanh2o.demo` | `staff123` |
| **Biologist** | **Meera Natarajan** | `officer.meera@cleanh2o.demo` | `staff123` |

---

## 📂 Project Architecture

```
├── dist/                   # Production build output (static frontend + server.cjs)
├── public/                 # Public static assets
├── server/
│   └── apiRouter.ts        # Express REST API & spatial analysis logic
├── src/
│   ├── components/         # Reusable UI components (Header, Map, Modals)
│   ├── contexts/           # React AuthContext with instant persona switching
│   ├── pages/              # Views (Landing, Citizen, Staff, Admin, Map, Lakes)
│   ├── services/           # Typed API client (`api.ts`)
│   └── types.ts            # TypeScript data models and interfaces
├── uploads/                # User photo uploads storage
├── Dockerfile              # Production container build definition
├── docker-compose.yml      # 1-command container deployment configuration
├── package.json            # Node.js dependencies and scripts
├── seed_db.json            # Complete preloaded data (8 lakes, 125 incidents, history)
├── server.ts               # Full-stack server entry point (Express + Vite/Static)
└── vite.config.ts          # Vite build configuration with Tailwind CSS v4
```

---

## 📡 Key API Endpoints

- `GET /health` / `GET /api/health` — Platform health check
- `POST /api/auth/login` — Authentication & JWT issuance
- `GET /api/lakes` — Retrieve the 8 Coimbatore urban wetlands and live health scores
- `GET /api/incidents` — Filterable incident records (by lake, category, severity, status)
- `POST /api/incidents` — Submit a new geo-tagged incident report
- `POST /api/incidents/check-duplicates` — 200m spatial duplicate detection
- `PATCH /api/incidents/:id/status` — Update incident status (assigned, in progress, resolved)
- `GET /api/analytics/overview` — Municipal statistics, resolution velocity, and basin metrics

---

## 🛡️ License
Built for the Coimbatore City Municipal Corporation (CCMC) Lake Rejuvenation Initiative. Open source for municipal and civic environmental monitoring.
