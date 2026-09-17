import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Shield,
  User,
  CheckCircle2,
  AlertTriangle,
  Send,
  Layers,
  FileText,
  Flame,
  Award,
} from "lucide-react";
import { api } from "../services/api";
import { Incident, User as UserType, IncidentStatus } from "../types";
import { useAuth } from "../contexts/AuthContext";

const markerIcon = L.divIcon({
  html: `
    <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 18px; height: 18px; background: #0284c7; border: 2px solid white; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: "custom-detail-marker",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [staffList, setStaffList] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workflow actions state
  const [selectedStaffId, setSelectedStaffId] = useState<number | "">("");
  const [assignNote, setAssignNote] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [newStatus, setNewStatus] = useState<IncidentStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const data = await api.getIncidentById(Number(id));
      setIncident(data);
      if (data.assigned_to) setSelectedStaffId(data.assigned_to);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load incident detail.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    if (isStaffOrAdmin) {
      api.getStaffMembers().then(setStaffList).catch(() => {});
    }
  }, [id, isStaffOrAdmin]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !selectedStaffId) return;
    setIsAssigning(true);
    setErrorMessage(null);
    try {
      await api.assignIncident(incident.id, Number(selectedStaffId), assignNote);
      setAssignNote("");
      await fetchDetail();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !newStatus) return;
    if (newStatus === "RESOLVED" && !resolutionNote.trim()) {
      setErrorMessage("A detailed resolution note is required before an incident can be marked RESOLVED.");
      return;
    }
    setIsUpdatingStatus(true);
    setErrorMessage(null);
    try {
      await api.updateIncidentStatus(incident.id, {
        status: newStatus,
        note: statusNote || undefined,
        resolution_note: newStatus === "RESOLVED" ? resolutionNote : undefined,
      });
      setNewStatus("");
      setStatusNote("");
      setResolutionNote("");
      await fetchDetail();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-slate-500">Loading incident...</div>;
  }

  if (!incident) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Incident Not Found</h2>
        <p className="text-xs text-slate-500 mb-4">{errorMessage || "The requested incident record does not exist."}</p>
        <Link to="/incidents" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
          ← Back to Incident List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Incident Triage</span>
      </button>

      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-sky-700">{incident.report_code}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-700">
                {incident.severity} Severity
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                {incident.status.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{incident.category_name}</h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Lake: <strong className="text-slate-700">{incident.lake_name}</strong></span>
              <span>•</span>
              <span>Reported: {new Date(incident.created_at).toLocaleString()}</span>
            </p>
          </div>

          {/* Smart Priority Score Badge */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-rose-800">
              <Flame className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold">Priority: {incident.priority_score || 50} / 100</span>
            </div>
            {incident.priority_reasons && incident.priority_reasons.length > 0 && (
              <span className="text-[10px] text-slate-500 mt-1 max-w-xs text-right">
                {incident.priority_reasons.join(" • ")}
              </span>
            )}
          </div>
        </div>

        {/* Content grid: Photo + Description & Map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Citizen Observation
            </span>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
              {incident.description}
            </p>

            {incident.resolution_note && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                  Official Resolution Note
                </span>
                <p className="text-xs text-emerald-900 leading-relaxed">{incident.resolution_note}</p>
                {incident.resolved_at && (
                  <span className="text-[10px] text-emerald-700 block mt-2">
                    Resolved on {new Date(incident.resolved_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {incident.image_url ? (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Evidence Photo
                </span>
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-64 bg-slate-100">
                  <img
                    src={incident.image_url}
                    alt="Evidence"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Location Map */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              GIS Position ({incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)})
            </span>
            <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 relative mb-3">
              <MapContainer
                center={[incident.latitude, incident.longitude]}
                zoom={15}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[incident.latitude, incident.longitude]} icon={markerIcon} />
              </MapContainer>
            </div>
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span>Lake Basin: {incident.lake_name}</span>
              <Link to="/map" className="text-sky-600 font-semibold hover:underline">
                View in Full GIS Map →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Actions Section */}
      {isStaffOrAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Municipal Staff Operations
            </h2>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded-xl">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assignment form */}
            <form onSubmit={handleAssign} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800 block mb-2">Assign Field Officer</span>
              <div className="space-y-3">
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="">Select Staff Member...</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.role.toUpperCase()})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="Assignment notes / instructions..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={isAssigning || !selectedStaffId}
                  className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  {isAssigning ? "Assigning..." : "Update Assignment"}
                </button>
              </div>
            </form>

            {/* Status Transition form */}
            <form onSubmit={handleStatusUpdate} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800 block mb-2">Update Incident Status</span>
              <div className="space-y-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as IncidentStatus)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="">Select Target Status...</option>
                  <option value="ASSIGNED">ASSIGNED - Dispatch field team</option>
                  <option value="IN_PROGRESS">IN_PROGRESS - Inspection / work active</option>
                  <option value="RESOLVED">RESOLVED - Remediation complete</option>
                  <option value="CLOSED">CLOSED - Verified & archived</option>
                </select>

                {newStatus === "RESOLVED" && (
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                      Required: Detail the corrective actions taken:
                    </label>
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      rows={2}
                      placeholder="E.g., 400kg plastic refuse collected and culvert cleared..."
                      className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none ring-1 ring-emerald-400"
                      required
                    />
                  </div>
                )}

                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Audit note (optional)..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={isUpdatingStatus || !newStatus}
                  className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  {isUpdatingStatus ? "Updating..." : "Commit Status Transition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">
          Status Audit Trail & History
        </h2>

        <div className="space-y-4">
          {incident.status_history && incident.status_history.length > 0 ? (
            incident.status_history.map((hist, idx) => (
              <div key={hist.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0 font-bold text-xs">
                  {idx + 1}
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">
                      Status transitioned to{" "}
                      <strong className="text-sky-700 uppercase">{hist.new_status}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(hist.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mb-1">{hist.note}</p>
                  <span className="text-[10px] text-slate-400">
                    Logged by: {hist.changer_name || "System"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No status transitions logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
