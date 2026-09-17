import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
  Shield,
  ExternalLink,
  ChevronRight,
  Flame,
  LayoutGrid,
  List,
} from "lucide-react";
import { api } from "../services/api";
import { Incident, Lake, IssueCategory, IncidentSeverity, IncidentStatus } from "../types";
import { useAuth } from "../contexts/AuthContext";

export const IncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [lakes, setLakes] = useState<Lake[]>([]);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLake, setSelectedLake] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("priority"); // priority, newest, severity
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [personaFilter, setPersonaFilter] = useState<"all" | "role_specific">("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [incs, lks, cats] = await Promise.all([
          api.getIncidents({ limit: 200, sort_by: sortBy }),
          api.getLakes(),
          api.getCategories(),
        ]);
        setIncidents(incs);
        setLakes(lks);
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load incidents", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [sortBy]);

  // Client-side quick filter
  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (personaFilter === "role_specific") {
        if (user?.role === "citizen") {
          const myId = user?.id || 1;
          if (Number(inc.user_id) !== Number(myId)) return false;
        } else if (user?.role === "staff") {
          const myId = user?.id || 2;
          if (Number(inc.assigned_to) !== Number(myId)) return false;
        } else if (user?.role === "admin") {
          if (inc.assigned_to) return false;
        }
      }
      if (selectedLake !== "all" && String(inc.lake_id) !== selectedLake) return false;
      if (selectedCategory !== "all" && String(inc.category_id) !== selectedCategory) return false;
      if (selectedSeverity !== "all" && inc.severity !== selectedSeverity) return false;
      if (selectedStatus !== "all" && inc.status !== selectedStatus) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const codeMatch = inc.report_code.toLowerCase().includes(q);
        const descMatch = inc.description.toLowerCase().includes(q);
        const lakeMatch = inc.lake_name?.toLowerCase().includes(q);
        if (!codeMatch && !descMatch && !lakeMatch) return false;
      }
      return true;
    });
  }, [incidents, selectedLake, selectedCategory, selectedSeverity, selectedStatus, searchTerm, personaFilter, user]);

  const statusColumns: IncidentStatus[] = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

  const getSeverityBadge = (sev: IncidentSeverity) => {
    const config = {
      CRITICAL: "bg-rose-100 text-rose-800 border-rose-200",
      HIGH: "bg-amber-100 text-amber-800 border-amber-200",
      MEDIUM: "bg-sky-100 text-sky-800 border-sky-200",
      LOW: "bg-emerald-100 text-emerald-800 border-emerald-200",
    }[sev] || "bg-slate-100 text-slate-800 border-slate-200";

    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${config}`}>
        {sev}
      </span>
    );
  };

  const getStatusBadge = (status: IncidentStatus) => {
    const config = {
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      ASSIGNED: "bg-sky-50 text-sky-700 border-sky-200",
      IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
      RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      CLOSED: "bg-slate-50 text-slate-700 border-slate-200",
    }[status] || "bg-slate-50 text-slate-700 border-slate-200";

    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${config}`}>
        {status.replace("_", " ").toLowerCase()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                user?.role === "citizen"
                  ? "bg-teal-100 text-teal-800"
                  : user?.role === "staff"
                  ? "bg-sky-100 text-sky-800"
                  : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {user?.role === "citizen" ? "Citizen View" : user?.role === "staff" ? "Field Operations View" : "Executive View"}
            </span>
            <span className="text-xs text-slate-500">• {user?.full_name || "Citizen User"}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user?.role === "staff"
              ? "Municipal Work Orders & Field Triage"
              : user?.role === "admin"
              ? "City-Wide Incident Command"
              : "Community Lake Incident Reports"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.role === "staff"
              ? "Field engineering queue for inspection, desiltation, and cleanup operations."
              : user?.role === "admin"
              ? "Master environmental incident register with staff allocation oversight."
              : "Track reports, verify cleanups, and report environmental issues across Coimbatore lakes."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "list" ? "bg-white text-sky-700 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "board" ? "bg-white text-sky-700 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>

          <Link
            to="/report"
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-xs"
          >
            + Report New Issue
          </Link>
        </div>
      </div>

      {/* Persona Quick Filter Banner */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 pl-1">Scope:</span>
          <button
            onClick={() => setPersonaFilter("all")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              personaFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All City Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setPersonaFilter("role_specific")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              personaFilter === "role_specific"
                ? user?.role === "citizen"
                  ? "bg-teal-600 text-white shadow-xs"
                  : user?.role === "staff"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {user?.role === "citizen"
              ? "🌿 My Submissions Only"
              : user?.role === "staff"
              ? "🛠️ Assigned to Me (Dr. Suseela AE)"
              : "⚡ Unassigned Triage Queue"}
          </button>
        </div>

        <span className="text-[11px] text-slate-500 pr-1">
          {personaFilter === "role_specific"
            ? `Filtered to your ${user?.role || "citizen"} persona scope`
            : "Showing entire Coimbatore wetland network"}
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by report code (e.g. CW-2026-00012), lake, or description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 shrink-0 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="priority">🔥 Smart Priority Score</option>
              <option value="newest">🕒 Newest First</option>
              <option value="severity">⚠️ Highest Severity</option>
            </select>
          </div>
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <select
            value={selectedLake}
            onChange={(e) => setSelectedLake(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="all">All Lakes</option>
            {lakes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <span className="text-slate-400 ml-auto">
            Showing {filtered.length} of {incidents.length}
          </span>
        </div>
      </div>

      {/* Main Content: List or Board */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading incidents...</div>
      ) : viewMode === "list" ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No matching incident reports found.</div>
            ) : (
              filtered.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Priority score indicator */}
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                        (inc.priority_score || 50) >= 80
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : (inc.priority_score || 50) >= 60
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-sky-50 border-sky-200 text-sky-700"
                      }`}
                      title={inc.priority_reasons?.join("; ")}
                    >
                      <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                      <span className="text-sm font-bold">{inc.priority_score || 50}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-sky-700">
                          {inc.report_code}
                        </span>
                        {getSeverityBadge(inc.severity)}
                        {getStatusBadge(inc.status)}
                        <span className="text-xs font-medium text-slate-500">
                          • {inc.lake_name}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-800 line-clamp-1">
                        <span className="font-semibold text-slate-900 mr-1.5">{inc.category_name}:</span>
                        {inc.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(inc.created_at).toLocaleDateString()}
                        </span>
                        {inc.assignee_name && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <User className="w-3 h-3 text-sky-600" />
                            Assigned to: {inc.assignee_name}
                          </span>
                        )}
                        {inc.priority_reasons && inc.priority_reasons.length > 0 && (
                          <span className="text-slate-500 italic truncate max-w-xs">
                            ({inc.priority_reasons[0]})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Board / Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-6">
          {statusColumns.map((col) => {
            const colIncidents = filtered.filter((i) => i.status === col);
            return (
              <div key={col} className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col min-w-[240px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {col.replace("_", " ")}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-white rounded-full text-slate-600 border border-slate-200">
                    {colIncidents.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-22rem)]">
                  {colIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                      className="bg-white p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-xs cursor-pointer transition-all text-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-sky-700">
                          {inc.report_code}
                        </span>
                        {getSeverityBadge(inc.severity)}
                      </div>

                      <div className="font-semibold text-slate-800 mb-1">{inc.category_name}</div>
                      <p className="text-slate-600 line-clamp-2 text-[11px] mb-2">{inc.description}</p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                        <span>{inc.lake_name}</span>
                        <span className="font-bold text-sky-700">P-Score: {inc.priority_score || 50}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
