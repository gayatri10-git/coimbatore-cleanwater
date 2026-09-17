import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  Waves,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  MapPin,
  Info,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { api } from "../services/api";
import { AnalyticsOverview } from "../types";

const CATEGORY_COLORS = [
  "#ef4444",
  "#8b5cf6",
  "#10b981",
  "#06b6d4",
  "#f59e0b",
  "#dc2626",
  "#6366f1",
  "#64748b",
  "#94a3b8",
];

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [lakeComparison, setLakeComparison] = useState<any[]>([]);
  const [categoryDist, setCategoryDist] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [ov, lk, cat, tr] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getAnalyticsLakes(),
          api.getAnalyticsCategories(),
          api.getAnalyticsTrends(),
        ]);
        setOverview(ov);
        setLakeComparison(lk);
        setCategoryDist(cat);
        setTrends(tr);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading || !overview) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
        Aggregating spatial and municipal metrics...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Spatial & Operational Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Performance metrics, incident density, and environmental trends across Coimbatore&apos;s urban lake system.
          </p>
        </div>

        <Link
          to="/map"
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs"
        >
          <MapPin className="w-4 h-4" />
          <span>GIS Heatmap View</span>
        </Link>
      </div>

      {/* Demonstration Dataset Disclaimer */}
      <div className="mb-8 p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <strong>Academic Demonstration Dataset:</strong> Figures and scores shown below are derived from simulated citizen incident logs to demonstrate smart city GIS prioritization, municipal triage queues, and lake rejuvenation monitoring workflows.
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Reports</span>
            <AlertTriangle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{overview.total_reports}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
            <span>Pending: <strong className="text-amber-600">{overview.pending_reports}</strong></span>
            <span>•</span>
            <span>Active: <strong className="text-sky-600">{overview.in_progress_reports}</strong></span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {overview.resolution_rate_percent}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {overview.resolved_reports} resolved / closed
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Resolution</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {overview.avg_resolution_hours} <span className="text-xs font-medium text-slate-400">hours</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">From submission to remediation</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Critical Backlog</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {overview.critical_unresolved_count}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            High urgency: <strong className="text-slate-700">{overview.high_unresolved_count}</strong>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Lake Comparison Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1">
            Lake Incident Volume & Resolution
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Comparison of total reported issues versus remediated incidents across the 8 lakes.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lakeComparison}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={65}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="Total Reports" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1">
            Incident Breakdown by Category
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Distribution of environmental concerns logged by citizens.
          </p>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDist}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={50}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {categoryDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lake Incident Density & Health Index Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Coimbatore Lake Incident Density Index
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Spatial distribution of reported issues normalized by water spread area in hectares.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-bold">Lake Name</th>
                <th className="py-3 px-4 font-bold">Water Area (ha)</th>
                <th className="py-3 px-4 font-bold">Total Issues</th>
                <th className="py-3 px-4 font-bold">Density / ha</th>
                <th className="py-3 px-4 font-bold">Resolution Rate</th>
                <th className="py-3 px-4 font-bold">Health Score</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lakeComparison.map((lake) => {
                const density = (lake.total / (lake.area_hectares || 1)).toFixed(2);
                return (
                  <tr key={lake.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{lake.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{lake.area_hectares} ha</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{lake.total}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-sky-700">{density}</span>
                      <span className="text-slate-400 text-[10px]"> / ha</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${lake.resolution_rate}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700">{lake.resolution_rate}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          lake.health_score >= 70
                            ? "bg-emerald-100 text-emerald-800"
                            : lake.health_score >= 50
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {lake.health_score} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/lakes/${lake.id}`}
                        className="text-sky-600 hover:text-sky-800 font-semibold text-xs"
                      >
                        Lake Analytics →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
