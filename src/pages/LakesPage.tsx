import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Waves, MapPin, AlertCircle, CheckCircle2, ChevronRight, ExternalLink, Activity, Info } from "lucide-react";
import { api } from "../services/api";
import { Lake } from "../types";

export const LakesPage: React.FC = () => {
  const [lakes, setLakes] = useState<Lake[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getLakes()
      .then(setLakes)
      .catch((err) => console.error("Failed to load lakes", err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coimbatore Urban Lakes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoring the 8 interconnected Noyyal basin water bodies undergoing Smart City eco-restoration.
          </p>
        </div>

        <Link
          to="/map"
          className="inline-flex items-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold px-4 py-2 rounded-xl transition-colors border border-sky-200"
        >
          <MapPin className="w-4 h-4" />
          <span>View All on GIS Map</span>
        </Link>
      </div>

      {/* Academic Disclaimer */}
      <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          <strong>Demonstration Health Metric:</strong> The platform health score is calculated dynamically from open citizen environmental incident density and resolution rates. It does not replace laboratory biochemical / BOD water testing.
        </p>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-500">Loading lake monitoring data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {lakes.map((lake) => {
            const isHealthy = lake.platform_health_score >= 70;
            const isWarning = lake.platform_health_score >= 50 && lake.platform_health_score < 70;
            const statusConfig = isHealthy
              ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Healthy" }
              : isWarning
              ? { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Warning" }
              : { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Critical Attention" };

            return (
              <div
                key={lake.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                      <Waves className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 mb-1">{lake.name}</h2>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {lake.description}
                  </p>

                  {/* Health Score Gauge */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Health Index</span>
                      <span className="font-bold text-slate-900">{lake.platform_health_score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isHealthy ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${lake.platform_health_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block">Water Spread</span>
                      <span className="font-semibold text-slate-700">{lake.area_hectares} ha</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block">Perimeter</span>
                      <span className="font-semibold text-slate-700">{lake.perimeter_km} km</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 py-2 border-t border-slate-100">
                    <span>
                      Active Issues: <strong className="text-rose-600">{lake.active_issue_count}</strong>
                    </span>
                    <span>
                      Resolved: <strong className="text-emerald-600">{lake.resolved_issue_count}</strong>
                    </span>
                  </div>
                </div>

                <Link
                  to={`/lakes/${lake.id}`}
                  className="mt-4 flex items-center justify-center gap-1.5 w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <span>Lake Analytics & Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
