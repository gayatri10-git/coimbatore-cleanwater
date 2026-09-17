import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Waves,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Camera,
  Shield,
  FileText,
  ChevronRight,
  Droplets,
  ExternalLink,
  Compass,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { Incident, Lake } from "../types";

export const CitizenPortalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [lakes, setLakes] = useState<Lake[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allIncs, lks] = await Promise.all([
          api.getIncidents({ limit: 100 }),
          api.getLakes(),
        ]);
        // Filter incidents submitted by this user (or fallback to citizen user id 1)
        const myUserId = user?.id || 1;
        const userIncs = allIncs.filter((i) => Number(i.user_id) === Number(myUserId));
        setMyIncidents(userIncs.length > 0 ? userIncs : allIncs.slice(0, 4));
        setLakes(lks);
      } catch (err) {
        console.error("Failed to load citizen portal data", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Persona Greeting Header */}
      <div className="bg-gradient-to-r from-teal-700 via-cyan-800 to-sky-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5 text-teal-300" />
              <span>Citizen Lake Guardian Portal • Ukkadam Ward 84</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Vanakkam, {user?.full_name || "Gayatri Tanisha Bitasta"}
            </h1>
            <p className="text-sm text-teal-100/80 mt-1 max-w-xl leading-relaxed">
              Track your environmental reports, monitor your neighborhood lake health, and submit verified GPS photo
              evidence of lake pollution in Coimbatore.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              to="/report"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 active:from-teal-500 text-slate-900 font-bold px-5 py-3 rounded-2xl shadow-lg shadow-teal-900/30 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-5 h-5 text-slate-900" />
              <span>Report Lake Issue</span>
            </Link>
            <Link
              to="/map"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-3 rounded-2xl border border-white/20 transition-colors"
            >
              <Compass className="w-4 h-4 text-teal-300" />
              <span>Open GIS Map</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Quick Cards: Submissions, Community Action, Local Watch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: My Submissions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Submissions</span>
              <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                {myIncidents.length}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">Active Field Inquiries</h3>
            <p className="text-xs text-slate-500 mt-1">
              Issues you reported to CCMC Lake Engineering teams.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {myIncidents.filter((i) => i.status === "RESOLVED").length} Resolved
            </span>
            <span className="text-amber-700 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {myIncidents.filter((i) => i.status !== "RESOLVED").length} In Progress
            </span>
          </div>
        </div>

        {/* Card 2: Duplicate Prevention */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Smart GIS Safeguard</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">200m Duplicate Check</h3>
            <p className="text-xs text-slate-500 mt-1">
              When reporting issues, the platform checks within a 200m buffer to avoid duplicate reports and combine
              evidence.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Reduces municipal backlog</span>
            <span className="font-semibold text-sky-700">Active</span>
          </div>
        </div>

        {/* Card 3: Local Lake Health Advisory */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Neighborhood Watch</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">Ukkadam Lake Status</h3>
            <p className="text-xs text-slate-500 mt-1">
              Health Index: <strong className="text-emerald-700">78/100 (Good)</strong>. Smart City promenade active for
              walkers.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Water hyacinth: Low</span>
            <Link to="/lakes/1" className="text-teal-700 hover:text-teal-900 font-semibold">
              View Lake Details →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Section: My Reported Incidents */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>My Reported Lake Issues & Progress</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track the exact municipal progress, assigned engineer, and resolution evidence for your submissions.
            </p>
          </div>
          <Link
            to="/report"
            className="self-start sm:self-auto flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Report</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading your submissions...</div>
        ) : myIncidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <p className="text-sm">You haven&apos;t reported any incidents yet.</p>
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"
            >
              Report an issue around Ukkadam or Valankulam now →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myIncidents.map((inc) => {
              const isResolved = inc.status === "RESOLVED";
              const isInProgress = inc.status === "IN_PROGRESS";
              const isAssigned = inc.status === "ASSIGNED";

              return (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="p-5 hover:bg-slate-50/80 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {inc.report_code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isResolved
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isInProgress
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : isAssigned
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {inc.status.replace("_", " ")}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">• {inc.lake_name}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{inc.description}</h4>

                      {inc.resolution_note && (
                        <div className="mt-2 text-xs bg-emerald-50/80 border border-emerald-200 text-emerald-900 p-2.5 rounded-xl flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">CCMC Field Resolution Note:</span> {inc.resolution_note}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                        <span>Reported on {new Date(inc.created_at).toLocaleDateString()}</span>
                        {inc.assignee_name && (
                          <span className="text-slate-600">Assigned Engineer: {inc.assignee_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-teal-700 text-xs font-semibold shrink-0">
                    <span>View Timeline</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Coimbatore 8 Lakes Directory for Citizens */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Coimbatore Urban Lake Directory</h3>
            <p className="text-xs text-slate-500">Live environmental score and water health across all 8 wetlands</p>
          </div>
          <Link to="/lakes" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
            <span>Explore full directory</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lakes.map((lake) => {
            const score = lake.platform_health_score || 70;
            return (
              <Link
                key={lake.id}
                to={`/lakes/${lake.id}`}
                className="p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {lake.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        score >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : score >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {score}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{lake.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{lake.area_hectares} ha spread</span>
                  <span className="text-teal-600 font-semibold group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
