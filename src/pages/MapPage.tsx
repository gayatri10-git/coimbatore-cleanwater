import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  Filter,
  Layers,
  Search,
  PlusCircle,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { api } from "../services/api";
import { Lake, Incident, IssueCategory, IncidentSeverity, IncidentStatus, HotspotPoint } from "../types";

// Leaflet coordinate helper for clicking
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Custom DivIcon creator for crisp SVG markers with dynamic colors
function createIncidentIcon(categoryColor: string, severity: IncidentSeverity, status: IncidentStatus) {
  const isResolved = status === "RESOLVED" || status === "CLOSED";
  const bg = isResolved ? "#10b981" : categoryColor || "#0284c7";
  const ringColor = severity === "CRITICAL" ? "#dc2626" : severity === "HIGH" ? "#ea580c" : "#38bdf8";

  const svgHtml = `
    <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      ${severity === "CRITICAL" && !isResolved ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(220, 38, 38, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ""}
      <div style="
        width: 24px;
        height: 24px;
        background: ${bg};
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25), 0 0 0 2px ${ringColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: bold;
      ">
        ${isResolved ? "✓" : "!"}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "custom-leaflet-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [lakes, setLakes] = useState<Lake[]>([]);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hotspots, setHotspots] = useState<HotspotPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [selectedLakeId, setSelectedLakeId] = useState<number | "all">("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<"incidents" | "density">("incidents");

  // Selection state
  const [selectedLakeCard, setSelectedLakeCard] = useState<Lake | null>(null);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lakesRes, catsRes, incsRes, hotRes] = await Promise.all([
          api.getLakes(),
          api.getCategories(),
          api.getIncidents({ limit: 300 }),
          api.getAnalyticsHotspots(),
        ]);
        setLakes(lakesRes);
        setCategories(catsRes);
        setIncidents(incsRes);
        setHotspots(hotRes);
      } catch (err) {
        console.error("Failed to load GIS data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (selectedLakeId !== "all" && inc.lake_id !== selectedLakeId) return false;
      if (selectedCategoryId !== "all" && inc.category_id !== selectedCategoryId) return false;
      if (selectedSeverity !== "all" && inc.severity !== selectedSeverity) return false;
      if (selectedStatus !== "all" && inc.status !== selectedStatus) return false;
      return true;
    });
  }, [incidents, selectedLakeId, selectedCategoryId, selectedSeverity, selectedStatus]);

  // Center of Coimbatore
  const coimbatoreCenter: [number, number] = [10.9950, 76.9650];

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Top Filter Overlay Bar */}
      <div className="z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 mr-1">
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              <span>GIS Filters:</span>
            </div>

            {/* Lake Selector */}
            <select
              value={selectedLakeId}
              onChange={(e) => setSelectedLakeId(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All 8 Lakes ({lakes.length})</option>
              {lakes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.platform_health_score}/100)
                </option>
              ))}
            </select>

            {/* Category Selector */}
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Severity Selector */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="HIGH">🟠 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>

            {/* Status Selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending Triage</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Right Controls: Layer View Switcher & Result Count */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{filteredIncidents.length}</strong> reports
            </span>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode("incidents")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "incidents"
                    ? "bg-white text-sky-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Markers
              </button>
              <button
                onClick={() => setViewMode("density")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "density"
                    ? "bg-white text-sky-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Density Hotspots
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative flex-1 w-full h-full">
        {isLoading ? (
          <div className="absolute inset-0 z-30 bg-slate-50/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-600">Loading Coimbatore GIS Map Layers...</span>
            </div>
          </div>
        ) : null}

        <MapContainer
          center={coimbatoreCenter}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler
            onLocationSelect={(lat, lng) => {
              setClickedCoords({ lat, lng });
            }}
          />

          {/* 8 Coimbatore Lake Buffers and Waterbody Polygons */}
          {lakes.map((lake) => {
            const isHealthy = lake.platform_health_score >= 70;
            const isWarning = lake.platform_health_score >= 50 && lake.platform_health_score < 70;
            const color = isHealthy ? "#059669" : isWarning ? "#d97706" : "#dc2626";

            // Approximate radius based on lake area in hectares (approx circle for spatial demonstration)
            const radiusMeters = Math.sqrt((lake.area_hectares * 10000) / Math.PI) * 0.75;

            return (
              <React.Fragment key={lake.id}>
                {/* Lake Water Surface Circle */}
                <Circle
                  center={[lake.latitude, lake.longitude]}
                  radius={radiusMeters}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.22,
                    color: color,
                    weight: 2,
                    dashArray: "4, 4",
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedLakeCard(lake);
                    },
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[200px]">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
                        <span className="font-bold text-sm text-slate-900">{lake.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isHealthy
                              ? "bg-emerald-100 text-emerald-800"
                              : isWarning
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {lake.platform_health_score}/100 Score
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{lake.description}</p>
                      <div className="grid grid-cols-2 gap-2 my-2 text-[11px] bg-slate-50 p-2 rounded">
                        <div>
                          <span className="text-slate-400 block">Area</span>
                          <span className="font-semibold text-slate-700">{lake.area_hectares} ha</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Perimeter</span>
                          <span className="font-semibold text-slate-700">{lake.perimeter_km} km</span>
                        </div>
                      </div>
                      <Link
                        to={`/lakes/${lake.id}`}
                        className="inline-flex items-center justify-center gap-1 w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-1.5 rounded text-xs transition-colors"
                      >
                        <span>Lake Analytics & Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </Popup>
                </Circle>
              </React.Fragment>
            );
          })}

          {/* Incident Markers View */}
          {viewMode === "incidents" &&
            filteredIncidents.map((incident) => {
              const icon = createIncidentIcon(
                incident.category_color || "#0ea5e9",
                incident.severity,
                incident.status
              );

              return (
                <Marker
                  key={incident.id}
                  position={[incident.latitude, incident.longitude]}
                  icon={icon}
                >
                  <Popup>
                    <div className="p-1 min-w-[240px] max-w-[280px]">
                      {incident.image_url && (
                        <div className="w-full h-28 rounded-lg overflow-hidden mb-2 bg-slate-100">
                          <img
                            src={incident.image_url}
                            alt="Incident report"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-[11px] font-bold text-sky-700">
                          {incident.report_code}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            incident.severity === "CRITICAL"
                              ? "bg-red-100 text-red-800"
                              : incident.severity === "HIGH"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {incident.severity}
                        </span>
                      </div>

                      <div className="font-semibold text-xs text-slate-800 mb-1">
                        {incident.category_name}
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 mb-2">
                        {incident.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(incident.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className="font-semibold text-slate-700 capitalize">
                          {incident.status.replace("_", " ")}
                        </span>
                      </div>

                      <Link
                        to={`/incidents/${incident.id}`}
                        className="mt-2 block text-center w-full py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 rounded hover:bg-sky-100 transition-colors"
                      >
                        View Full Triage Details →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Density Points View (Circles scaled by intensity and severity) */}
          {viewMode === "density" &&
            hotspots.map((point) => (
              <Circle
                key={point.id}
                center={[point.latitude, point.longitude]}
                radius={120 + point.intensity * 200}
                pathOptions={{
                  fillColor: point.intensity >= 0.8 ? "#ef4444" : point.intensity >= 0.5 ? "#f97316" : "#3b82f6",
                  fillOpacity: 0.35 + point.intensity * 0.35,
                  color: point.intensity >= 0.8 ? "#b91c1c" : "#ea580c",
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <div className="font-bold text-slate-800">{point.category_name}</div>
                    <div className="text-slate-500">{point.lake_name}</div>
                    <div className="mt-1 font-semibold text-red-600">Density Weight: {Math.round(point.intensity * 100)}%</div>
                  </div>
                </Popup>
              </Circle>
            ))}
        </MapContainer>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-5 left-5 z-20 bg-white/95 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 text-xs w-60">
          <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-sky-600" />
              GIS Map Legend
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs" />
                <span>Healthy Lake (&gt;70)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-xs" />
                <span>Warning Lake (50-69)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 border border-white shadow-xs" />
                <span>Critical Attention (&lt;50)</span>
              </div>
            </div>
            <div className="border-t border-slate-100 my-1.5 pt-1.5">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping inline-block" />
                <span>Critical Active Incident</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 mt-1">
                <span className="w-3 h-3 rounded-full bg-emerald-600 text-[8px] text-white flex items-center justify-center font-bold">✓</span>
                <span>Resolved Incident</span>
              </div>
            </div>
          </div>
        </div>

        {/* Click-to-report float box */}
        {clickedCoords && (
          <div className="absolute bottom-5 right-5 z-20 bg-white/95 backdrop-blur p-4 rounded-xl shadow-xl border border-slate-200 text-xs max-w-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-sky-600" />
              Location Selected
            </div>
            <p className="text-slate-500 mb-2 font-mono text-[10px]">
              Lat: {clickedCoords.lat.toFixed(5)}, Lng: {clickedCoords.lng.toFixed(5)}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  navigate(
                    `/report?lat=${clickedCoords.lat.toFixed(5)}&lng=${clickedCoords.lng.toFixed(5)}`
                  )
                }
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-medium py-1.5 px-3 rounded-lg text-center transition-colors shadow-xs"
              >
                Report Issue Here
              </button>
              <button
                onClick={() => setClickedCoords(null)}
                className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
