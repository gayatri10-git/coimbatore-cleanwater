import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Filter,
  User,
  Shield,
  Layers,
  Flame,
  Send,
  X,
  Compass,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { Incident, IncidentStatus, IncidentSeverity } from "../types";

export const StaffPortalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Resolution modal state
  const [activeModalIncident, setActiveModalIncident] = useState<Incident | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents({ limit: 150 });
      setIncidents(data);
    } catch (err) {
      console.error("Failed to load staff incidents", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const myUserId = user?.id || 2; // Dr. Suseela (AE)
  const displayedIncidents = filterAssignedToMe
    ? incidents.filter((i) => Number(i.assigned_to) === Number(myUserId))
    : incidents;

  const myAssignedCount = incidents.filter((i) => Number(i.assigned_to) === Number(myUserId)).length;
  const pendingCount = incidents.filter((i) => i.status === "PENDING").length;
  const inProgressCount = incidents.filter((i) => i.status === "IN_PROGRESS").length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;

  const handleAssignToMe = async (inc: Incident, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.assignIncident(inc.id, myUserId, "Self-assigned by Assistant Engineer Dr. Suseela for field verification.");
      setActionSuccessMsg(`Assigned ${inc.report_code} to you.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      await fetchIncidents();
    } catch (err: any) {
      alert("Failed to assign: " + err.message);
    }
  };

  const handleStartWork = async (inc: Incident, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateIncidentStatus(inc.id, {
        status: "IN_PROGRESS",
        note: "Field inspection team dispatched on-site.",
      });
      setActionSuccessMsg(`Started work on ${inc.report_code}.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      await fetchIncidents();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleOpenResolveModal = (inc: Incident, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveModalIncident(inc);
    setResolutionText(`Work completed on ${inc.lake_name}: desiltation & debris clearing verified by CCMC inspection team.`);
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalIncident) return;
    setIsSubmittingResolution(true);
    try {
      await api.updateIncidentStatus(activeModalIncident.id, {
        status: "RESOLVED",
        note: "Resolution completed by field unit.",
        resolution_note: resolutionText,
      });
      setActionSuccessMsg(`Marked ${activeModalIncident.report_code} as RESOLVED.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      setActiveModalIncident(null);
      await fetchIncidents();
    } catch (err: any) {
      alert("Failed to resolve: " + err.message);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const statusColumns: { key: IncidentStatus; label: string; color: string }[] = [
    { key: "PENDING", label: "Pending Triage", color: "border-amber-400 bg-amber-50/60" },
    { key: "ASSIGNED", label: "Assigned for Action", color: "border-sky-400 bg-sky-50/60" },
    { key: "IN_PROGRESS", label: "Work In Progress", color: "border-blue-400 bg-blue-50/60" },
    { key: "RESOLVED", label: "Resolved & Verified", color: "border-emerald-400 bg-emerald-50/60" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Persona Greeting Header */}
      <div className="bg-gradient-to-r from-sky-800 via-blue-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-sky-400/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-semibold mb-3">
              <Wrench className="w-3.5 h-3.5 text-sky-300" />
              <span>CCMC Engineering & Maintenance Workstation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dr. Suseela (Assistant Engineer)
            </h1>
            <p className="text-sm text-sky-100/80 mt-1 max-w-xl leading-relaxed">
              Field Operations Unit • Manage work orders, update incident statuses on-site, and log official resolution
              notes for Coimbatore urban lakes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/map"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-2xl border border-white/20 transition-colors text-xs sm:text-sm"
            >
              <Compass className="w-4 h-4 text-sky-300" />
              <span>GIS Field Map</span>
            </Link>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Assigned to Me</span>
          <div className="text-2xl font-black text-sky-700 mt-1">{myAssignedCount}</div>
          <span className="text-[10px] text-slate-500">Your direct active tasks</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Pending Triage</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-slate-500">Awaiting municipal assignment</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Active In Progress</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{inProgressCount}</div>
          <span className="text-[10px] text-slate-500">Field crews on site</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Resolved Lake Cases</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{resolvedCount}</div>
          <span className="text-[10px] text-slate-500">Verified cleanups</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Filter Work Orders:</span>
          <button
            onClick={() => setFilterAssignedToMe(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              !filterAssignedToMe
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All City Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setFilterAssignedToMe(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterAssignedToMe
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Assigned to Me ({myAssignedCount})
          </button>
        </div>

        <span className="text-xs text-slate-400">
          Showing {displayedIncidents.length} work orders across Coimbatore lakes
        </span>
      </div>

      {/* Interactive Field Work Order Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-8">
        {statusColumns.map((col) => {
          const colItems = displayedIncidents.filter((i) => i.status === col.key);

          return (
            <div
              key={col.key}
              className={`rounded-2xl p-4 border flex flex-col min-h-[500px] ${col.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {col.label}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 bg-white rounded-full text-slate-700 border border-slate-200 shadow-xs">
                  {colItems.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-20rem)] pr-1">
                {colItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic">No tasks in this stage</div>
                ) : (
                  colItems.map((inc) => {
                    const isAssignedToCurrent = Number(inc.assigned_to) === Number(myUserId);

                    return (
                      <div
                        key={inc.id}
                        onClick={() => navigate(`/incidents/${inc.id}`)}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-md cursor-pointer transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded">
                            {inc.report_code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              inc.severity === "CRITICAL"
                                ? "bg-rose-100 text-rose-800"
                                : inc.severity === "HIGH"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-xs text-slate-900 line-clamp-1">{inc.lake_name}</div>
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{inc.description}</p>
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>Score: {inc.priority_score || 50}</span>
                          {inc.assignee_name ? (
                            <span className="text-slate-600 truncate max-w-[120px]">
                              {inc.assignee_name.split(" ")[0]}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold">Unassigned</span>
                          )}
                        </div>

                        {/* Direct Municipal Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                          {!isAssignedToCurrent && inc.status !== "RESOLVED" && (
                            <button
                              onClick={(e) => handleAssignToMe(inc, e)}
                              className="flex-1 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 text-[10px] font-bold py-1 px-2 rounded-lg transition-colors cursor-pointer border border-slate-200"
                              title="Assign this task to Dr. Suseela (AE)"
                            >
                              Assign Me
                            </button>
                          )}

                          {inc.status === "ASSIGNED" && (
                            <button
                              onClick={(e) => handleStartWork(inc, e)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1 px-2 rounded-lg transition-colors cursor-pointer"
                            >
                              Start Work
                            </button>
                          )}

                          {inc.status === "IN_PROGRESS" && (
                            <button
                              onClick={(e) => handleOpenResolveModal(inc, e)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 px-2 rounded-lg transition-colors cursor-pointer"
                            >
                              Mark Resolved
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/incidents/${inc.id}`);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                            title="View Incident Details"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolution Modal */}
      {activeModalIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Resolve Lake Incident</h3>
              <button
                onClick={() => setActiveModalIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Reporting code: <strong className="text-slate-900">{activeModalIncident.report_code}</strong> at{" "}
              <strong>{activeModalIncident.lake_name}</strong>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Field Resolution Details (Visible to Citizens)
                </label>
                <textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Desiltation completed; trash skimmer removed 300kg plastic waste; sluice gate reopened."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalIncident(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolution}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {isSubmittingResolution ? "Saving..." : "Confirm Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
