import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Waves,
  ArrowRight,
  UserCheck,
  Send,
  Download,
  Filter,
  Flame,
  Layers,
  Compass,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { Incident, Lake, User as UserType, AnalyticsOverview } from "../types";

export const AdminPortalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [lakes, setLakes] = useState<Lake[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [staffList, setStaffList] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ov, lks, incs, stf] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getLakes(),
        api.getIncidents({ limit: 150, sort_by: "priority" }),
        api.getStaffMembers(),
      ]);
      setOverview(ov);
      setLakes(lks);
      setIncidents(incs);
      setStaffList(stf);
    } catch (err) {
      console.error("Failed to load admin portal data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickAssign = async (incidentId: number, staffId: number) => {
    try {
      await api.assignIncident(incidentId, staffId, "Direct municipal command dispatch by Director GIS.");
      setActionNotice("Work order dispatched successfully.");
      setTimeout(() => setActionNotice(null), 3000);
      await loadData();
    } catch (err: any) {
      alert("Failed to assign: " + err.message);
    }
  };

  // Unassigned incidents needing dispatch
  const unassignedList = incidents.filter((i) => !i.assigned_to && i.status !== "RESOLVED" && i.status !== "CLOSED");
  // Critical escalation queue (priority score >= 75)
  const criticalQueue = incidents.filter((i) => (i.priority_score || 0) >= 75 && i.status !== "RESOLVED");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Command Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5 text-indigo-300" />
              <span>CCMC Executive Lake Command Directorate</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ICCC (Integrated Command & Control Centre)
            </h1>
            <p className="text-sm text-indigo-100/80 mt-1 max-w-xl leading-relaxed">
              Basin-wide monitoring & municipal staff resource dispatch for 8 urban lakes across Coimbatore City
              Municipal Corporation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/analytics"
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md transition-colors text-xs sm:text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Full Analytics</span>
            </Link>
            <Link
              to="/map"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-2xl border border-white/20 transition-colors text-xs sm:text-sm"
            >
              <Compass className="w-4 h-4 text-indigo-300" />
              <span>Open GIS Map</span>
            </Link>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Urban Wetlands</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{overview?.total_lakes || 8} Lakes</div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">574 Hectares Total</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Field Incidents</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{overview?.total_reports || 125}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {overview?.resolved_reports || 57} Resolved ({overview?.resolution_rate_percent || 45.6}%)
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">High Priority Hotspots</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{overview?.critical_unresolved_count || 11}</div>
          <div className="text-[11px] text-rose-500 font-semibold mt-1">Critical severity unresolved</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Avg Response Velocity</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{overview?.avg_resolution_hours || 28.5} hrs</div>
          <div className="text-[11px] text-slate-500 mt-1">From citizen report to fix</div>
        </div>
      </div>

      {/* Municipal Staff Resource Dispatcher */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Staff Dispatch & Work Order Allocator</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign unallocated citizen reports directly to field engineering personnel.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 self-start sm:self-auto">
            {unassignedList.length} Unassigned Incidents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Report Code</th>
                <th className="p-4">Lake</th>
                <th className="p-4">Issue Description</th>
                <th className="p-4">Severity / Score</th>
                <th className="p-4">Assign Field Engineer</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unassignedList.slice(0, 6).map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50/70">
                  <td className="p-4 font-mono font-bold text-indigo-700">{inc.report_code}</td>
                  <td className="p-4 font-semibold text-slate-900">{inc.lake_name}</td>
                  <td className="p-4 max-w-xs truncate text-slate-600">{inc.description}</td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        inc.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : inc.severity === "HIGH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {inc.severity} (Score: {inc.priority_score || 50})
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleQuickAssign(inc.id, Number(e.target.value));
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="" disabled>
                        Select Staff Officer...
                      </option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.department || "Field AE"})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coimbatore 8 Lakes Basin Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Waves className="w-4 h-4 text-indigo-600" />
              <span>Noyyal Basin Lake Health & Spread Matrix</span>
            </h2>
            <p className="text-xs text-slate-500">Comprehensive municipal score card for all 8 urban water bodies</p>
          </div>
          <Link
            to="/lakes"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Lakes Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {lakes.map((lake) => {
            const score = lake.platform_health_score || 70;
            return (
              <div
                key={lake.id}
                onClick={() => navigate(`/lakes/${lake.id}`)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{lake.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        score >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : score >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {score}/100 Health
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Water spread: {lake.area_hectares} Hectares</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Capacity: {lake.storage_capacity_mcft || 45} mcft</span>
                  <span className="text-indigo-600 font-bold">Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
