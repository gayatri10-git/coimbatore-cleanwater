import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Waves,
  Shield,
  User,
  Wrench,
  BarChart3,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  Compass,
  Droplets,
  Activity,
  LogIn,
  Eye,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { Lake, UserRole } from "../types";

export const LandingPage: React.FC = () => {
  const { user, quickSwitchUser, login } = useAuth();
  const navigate = useNavigate();

  const [lakes, setLakes] = useState<Lake[]>([]);
  const [activeTab, setActiveTab] = useState<"personas" | "custom">("personas");
  const [customEmail, setCustomEmail] = useState("");
  const [customPass, setCustomPass] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    api.getLakes().then(setLakes).catch(() => {});
  }, []);

  const handlePersonaSelect = async (role: UserRole) => {
    setIsLoggingIn(true);
    // 1. Immediately kick off persona switch
    quickSwitchUser(role).catch((err) => console.warn("Background switch sync error:", err));

    // 2. Unconditionally navigate to the requested dashboard
    if (role === "citizen") {
      navigate("/citizen");
    } else if (role === "staff") {
      navigate("/staff");
    } else if (role === "admin") {
      navigate("/admin");
    }
    setIsLoggingIn(false);
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoggingIn(true);
    try {
      await login(customEmail, customPass);
      navigate("/map");
    } catch (err: any) {
      setAuthError(err.message || "Invalid credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-sky-950 to-slate-900 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background Ripple & Light Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[36rem] h-[36rem] rounded-full bg-cyan-600/15 blur-3xl" />
        {/* Subtle SVG wave contours */}
        <svg className="absolute w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="lake-mesh" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 0 40 Q 20 20 40 40 T 80 40" fill="none" stroke="currentColor" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lake-mesh)" />
        </svg>
      </div>

      {/* Top Brand Bar */}
      <header className="relative z-10 border-b border-sky-800/40 bg-slate-950/40 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 via-cyan-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">Coimbatore CleanWater</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Noyyal Basin GIS
                </span>
              </div>
              <p className="text-xs text-sky-200/70 hidden sm:block">
                Urban Lake Rejuvenation & Community Conservation Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/map"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-sky-200 hover:text-white hover:bg-sky-900/40 border border-sky-700/50 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              <span>Explore as Guest</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header Section */}
      <section className="relative z-10 pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-900/60 border border-sky-700/50 text-sky-200 text-xs font-medium mb-6 backdrop-blur">
          <Droplets className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Coimbatore City Municipal Corporation (CCMC) Lake Network</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Safeguarding Coimbatore&apos;s <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
            Historic Urban Wetlands
          </span>
        </h2>

        <p className="mt-4 text-base sm:text-lg text-sky-100/80 max-w-2xl mx-auto leading-relaxed">
          From Periyakulam Ukkadam to Singanallur marshlands: choose your persona below to step into a tailored
          operational workspace designed for citizen reporting, field engineering triage, or municipal command.
        </p>

        {/* Live Basin Metrics Strip */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-sky-800/40 backdrop-blur">
            <div className="text-[11px] font-semibold text-sky-300/70 uppercase">Protected Lakes</div>
            <div className="text-2xl font-bold text-white mt-0.5">8 Lakes</div>
            <div className="text-[10px] text-teal-300 mt-0.5">574 Hectares Spread</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-sky-800/40 backdrop-blur">
            <div className="text-[11px] font-semibold text-sky-300/70 uppercase">Field Reports</div>
            <div className="text-2xl font-bold text-cyan-300 mt-0.5">125 Reports</div>
            <div className="text-[10px] text-sky-300 mt-0.5">GPS & Photo Verified</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-sky-800/40 backdrop-blur">
            <div className="text-[11px] font-semibold text-sky-300/70 uppercase">Restoration Rate</div>
            <div className="text-2xl font-bold text-teal-300 mt-0.5">45.6%</div>
            <div className="text-[10px] text-emerald-300 mt-0.5">57 Resolved Cases</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-sky-800/40 backdrop-blur">
            <div className="text-[11px] font-semibold text-sky-300/70 uppercase">Resolution Velocity</div>
            <div className="text-2xl font-bold text-amber-300 mt-0.5">28.5 hrs</div>
            <div className="text-[10px] text-amber-200 mt-0.5">Average Field Turnaround</div>
          </div>
        </div>
      </section>

      {/* Persona Gateways Section */}
      <section className="relative z-10 py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full flex-1">
        <div className="text-center mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-white">Select Your Operational Persona</h3>
          <p className="text-xs sm:text-sm text-sky-200/70 mt-1">
            Each persona unlocks a custom workspace and interface tailored to their responsibilities.
          </p>
        </div>

        {/* 3 Main Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Persona 1: Citizen */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-teal-500/30 hover:border-teal-400 p-6 flex flex-col justify-between shadow-xl shadow-teal-950/30 hover:shadow-teal-500/10 transition-all hover:-translate-y-1">
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-bold uppercase tracking-wider">
              Community
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <User className="w-6 h-6" />
              </div>

              <div className="text-xs font-semibold text-teal-400 tracking-wide uppercase">Citizen Guardian</div>
              <h4 className="text-lg font-bold text-white mt-0.5">Gayatri Tanisha Bitasta</h4>
              <p className="text-xs text-sky-200/60 mt-0.5">Resident of Ukkadam & Morning Lake Walker</p>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <span>Pinpoint GPS incident reporting with photo evidence</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <span>Instant 200m duplicate warning before submitting</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <span>Personal report tracker with municipal status updates</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => handlePersonaSelect("citizen")}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 active:from-teal-600 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-teal-900/40 transition-all cursor-pointer group-hover:shadow-teal-500/25"
              >
                <span>Enter as Citizen</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">Unlocks Community Dashboard & Submission Tracker</p>
            </div>
          </div>

          {/* Persona 2: Municipal Field Staff */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-sky-500/30 hover:border-sky-400 p-6 flex flex-col justify-between shadow-xl shadow-sky-950/30 hover:shadow-sky-500/10 transition-all hover:-translate-y-1">
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold uppercase tracking-wider">
              Field Operations
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wrench className="w-6 h-6" />
              </div>

              <div className="text-xs font-semibold text-sky-400 tracking-wide uppercase">Assistant Engineer</div>
              <h4 className="text-lg font-bold text-white mt-0.5">Dr. Suseela (AE)</h4>
              <p className="text-xs text-sky-200/60 mt-0.5">CCMC Lake Maintenance & Sanitation Unit</p>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>Work Order Kanban: drag or transition pending to in-progress</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>Assigned task queue filtered directly to officer</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>One-click resolution logging with skimmer & clean-up notes</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => handlePersonaSelect("staff")}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:from-sky-600 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-sky-900/40 transition-all cursor-pointer group-hover:shadow-sky-500/25"
              >
                <span>Enter as Municipal Staff</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">Unlocks Field Workstation & Kanban Triage</p>
            </div>
          </div>

          {/* Persona 3: GIS Admin */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-indigo-500/30 hover:border-indigo-400 p-6 flex flex-col justify-between shadow-xl shadow-indigo-950/30 hover:shadow-indigo-500/10 transition-all hover:-translate-y-1">
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold uppercase tracking-wider">
              City Command
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>

              <div className="text-xs font-semibold text-indigo-400 tracking-wide uppercase">Director, GIS & Lakes</div>
              <h4 className="text-lg font-bold text-white mt-0.5">ICCC</h4>
              <p className="text-xs text-sky-200/60 mt-0.5">Integrated Command and Control Centre • CCMC</p>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>City-wide Lake Health Command matrix across 8 reservoirs</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Staff dispatcher: 1-click incident assignment & workload balance</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Critical hotspot escalation alerts (P-Score ≥ 80)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => handlePersonaSelect("admin")}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 active:from-indigo-600 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-900/40 transition-all cursor-pointer group-hover:shadow-indigo-500/25"
              >
                <span>Enter as GIS Admin</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">Unlocks Executive Command & Dispatch Center</p>
            </div>
          </div>
        </div>

        {/* Custom Login Drawer Toggle */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setActiveTab(activeTab === "personas" ? "custom" : "personas")}
            className="inline-flex items-center gap-2 text-xs text-sky-300/80 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>
              {activeTab === "personas"
                ? "Or sign in with custom municipal email & password"
                : "Return to one-click persona selection"}
            </span>
          </button>

          {activeTab === "custom" && (
            <form
              onSubmit={handleCustomLogin}
              className="mt-4 max-w-sm mx-auto p-5 rounded-2xl bg-slate-900/90 border border-sky-800/60 text-left space-y-3 shadow-2xl"
            >
              <div className="text-xs font-semibold text-white">Custom Account Sign-In</div>
              {authError && (
                <div className="text-[11px] text-rose-300 bg-rose-950/50 p-2 rounded border border-rose-800">
                  {authError}
                </div>
              )}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@cleanh2o.demo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  value={customPass}
                  onChange={(e) => setCustomPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Coimbatore 8 Lakes Showcase at the Bottom */}
      <section className="relative z-10 border-t border-sky-900/40 bg-slate-950/60 backdrop-blur-md py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Waves className="w-4 h-4 text-teal-400" />
                <span>Coimbatore Urban Lake Network & Live Health Index</span>
              </h4>
              <p className="text-xs text-slate-400">
                Connected feeder channels along the historic Noyyal River catchment
              </p>
            </div>
            <Link
              to="/lakes"
              className="text-xs text-teal-300 hover:text-teal-200 font-medium flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View all lakes directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {lakes.map((lake) => {
              const score = lake.platform_health_score || 70;
              const isHealthy = score >= 80;
              const isWarning = score >= 50 && score < 80;

              return (
                <Link
                  key={lake.id}
                  to={`/lakes/${lake.id}`}
                  className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-sky-800/30 hover:border-teal-500/50 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isHealthy ? "bg-emerald-400 ring-2 ring-emerald-400/20" : isWarning ? "bg-amber-400 ring-2 ring-amber-400/20" : "bg-rose-500 ring-2 ring-rose-500/20"
                        }`}
                      />
                      <span className="text-[10px] font-bold text-slate-300">{score}/100</span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate group-hover:text-teal-300 transition-colors">
                      {lake.name.replace(" Lake", "")}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                    <span>{lake.area_hectares} ha</span>
                    <span className="text-teal-400/80 group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
