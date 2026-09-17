import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.database.session import engine, Base
from backend.app.routers import auth, lakes, incidents, analytics, notifications, gis

# Create tables if not existing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Coimbatore CleanWater API",
    description="Community GIS & Lake Monitoring Platform API for urban lake rejuvenation in Coimbatore, Tamil Nadu.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for image uploads
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Health check
@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Coimbatore CleanWater API",
        "version": "1.0.0",
        "platform": "FastAPI + PostGIS/Spatial GIS"
    }

# Register Routers
app.include_router(auth.router, prefix="/api")
app.include_router(lakes.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(gis.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
