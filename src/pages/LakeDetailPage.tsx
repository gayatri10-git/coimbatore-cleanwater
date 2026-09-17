import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  Waves,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { api } from "../services/api";
import { Lake, Incident } from "../types";

const markerIcon = L.divIcon({
  html: `
    <div style="width: 20px; height: 20px; background: #0284c7; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
  `,
  className: "lake-marker-icon",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const PIE_COLORS = ["#ef4444", "#8b5cf6", "#10b981", "#06b6d4", "#f59e0b", "#dc2626", "#6366f1", "#64748b"];

export const LakeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lake, setLake] = useState<Lake | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [radiusMeters, setRadiusMeters] = useState<number>(1500);
  const [spatialResults, setSpatialResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchLake = async () => {
      try {
        const [lData, sData, gisData] = await Promise.all([
          api.getLakeById(Number(id)),
          api.getLakeStatistics(Number(id)),
          api.getLakeNearbyIncidents(Number(id), radiusMeters),
        ]);
        setLake(lData);
        setStats(sData);
        setSpatialResults(gisData);
      } catch (err) {
        console.error("Failed to load lake detail", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLake();
  }, [id, radiusMeters]);

  if (isLoading || !lake) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500">Loading lake analytics...</div>;
  }

  const isHealthy = lake.platform_health_score >= 70;
  const isWarning = lake.platform_health_score >= 50 && lake.platform_health_score < 70;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate("/lakes")}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Lake Catalog</span>
      </button>

      {/* Lake Hero Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Waves className="w-5 h-5" />
              </span>
              <span
                className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  isHealthy
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isWarning
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {isHealthy ? "Healthy" : isWarning ? "Warning" : "Critical Attention"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{lake.name}</h1>
            <p className="text-xs text-slate-600 max-w-2xl mt-1 leading-relaxed">{lake.description}</p>
          </div>

          {/* Platform Health Score Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shrink-0 flex items-center gap-5 min-w-[240px]">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-0.5">Platform Score</span>
              <span className="text-3xl font-extrabold text-slate-900">{lake.platform_health_score}</span>
              <span className="text-xs text-slate-500 font-semibold"> / 100</span>
            </div>
            <div className="border-l border-slate-200 pl-4 text-xs text-slate-500 space-y-1">
              <div>Resolution: <strong className="text-slate-700">{stats?.resolution_rate_percent || 0}%</strong></div>
              <div>Active Issues: <strong className="text-rose-600">{stats?.active_reports || 0}</strong></div>
              <div>Resolved: <strong className="text-emerald-600">{stats?.resolved_reports || 0}</strong></div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            This score reflects citizen-reported environmental incidents and resolution efficiency. Academic demonstration index.
          </span>
        </div>
      </div>

      {/* GIS Map & Spatial Radius Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                GIS Spatial Radius Query
              </h2>
              <p className="text-xs text-slate-500">
                PostGIS spatial filter of environmental incidents around {lake.name}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Radius:</span>
              {[500, 1000, 1500, 2000].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusMeters(r)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                    radiusMeters === r
                      ? "bg-sky-600 border-sky-600 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {r}m
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              center={[lake.latitude, lake.longitude]}
              zoom={14}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Lake boundary buffer */}
              <Circle
                center={[lake.latitude, lake.longitude]}
                radius={radiusMeters}
                pathOptions={{
                  fillColor: "#0284c7",
                  fillOpacity: 0.1,
                  color: "#0284c7",
                  weight: 2,
                  dashArray: "4, 4",
                }}
              />

              {spatialResults?.incidents?.map((inc: any) => (
                <Marker
                  key={inc.id}
                  position={[inc.latitude, inc.longitude]}
                  icon={markerIcon}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <div className="font-bold text-sky-700">{inc.report_code}</div>
                      <div className="font-semibold text-slate-800">{inc.category_name}</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Distance: {inc.distance_meters}m from center
                      </div>
                      <Link
                        to={`/incidents/${inc.id}`}
                        className="mt-1 block text-sky-600 font-semibold"
                      >
                        View Report →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Found <strong className="text-slate-800">{spatialResults?.incident_count || 0}</strong> incidents within {radiusMeters}m of lake center.
            </span>
            <Link to="/map" className="text-sky-600 font-semibold hover:underline">
              Open Full Interactive Map →
            </Link>
          </div>
        </div>

        {/* Spatial Stats Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">
              Geographic Profile
            </h2>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-slate-500">Center Coordinates</span>
                <span className="font-mono font-medium text-slate-800">
                  {lake.latitude.toFixed(4)}, {lake.longitude.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-slate-500">Water Spread Area</span>
                <span className="font-bold text-slate-800">{lake.area_hectares} hectares</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-slate-500">Shoreline Perimeter</span>
                <span className="font-bold text-slate-800">{lake.perimeter_km} km</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-slate-500">River Basin</span>
                <span className="font-bold text-slate-800">Noyyal Sub-basin</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Recorded Reports</span>
                <span className="font-bold text-slate-800">{stats?.total_reports || 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to={`/report?lat=${lake.latitude}&lng=${lake.longitude}`}
              className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors shadow-xs"
            >
              <span>Report Issue at this Lake</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Category Breakdown Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">
              Issues by Category
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.category_distribution}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">
              Severity Distribution
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.severity_distribution}>
                  <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
