import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Waves,
  MapPin,
  AlertCircle,
  PlusCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  Shield,
  User as UserIcon,
  ChevronDown,
  Wrench,
  LayoutDashboard,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { NotificationItem, UserRole } from "../types";

export const Header: React.FC = () => {
  const { user, quickSwitchUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    if (user) {
      api.getNotifications().then(setNotifications).catch(() => {});
    }
  }, [user, location.pathname]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: number) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handlePersonaSwitch = async (role: UserRole) => {
    setShowRoleMenu(false);
    quickSwitchUser(role).catch((err) => console.warn("Background persona switch sync error:", err));
    if (role === "citizen") {
      navigate("/citizen");
    } else if (role === "staff") {
      navigate("/staff");
    } else if (role === "admin") {
      navigate("/admin");
    }
  };

  const role = user?.role || "citizen";

  // Role-customized navigation
  const navLinks = [
    ...(role === "citizen"
      ? [{ to: "/citizen", label: "My Dashboard", icon: LayoutDashboard }]
      : role === "staff"
      ? [{ to: "/staff", label: "Field Workstation", icon: Wrench }]
      : [{ to: "/admin", label: "Command Center", icon: Shield }]),
    { to: "/map", label: "GIS Map", icon: MapPin },
    {
      to: "/incidents",
      label: role === "staff" ? "Work Orders" : role === "admin" ? "All Incidents" : "Community Reports",
      icon: AlertCircle,
    },
    { to: "/lakes", label: "Lakes", icon: Waves },
    ...(role !== "citizen" ? [{ to: "/analytics", label: "Analytics", icon: BarChart3 }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      {/* Top Active Persona Context Banner */}
      <div
        className={`px-4 py-1.5 text-xs flex items-center justify-between border-b transition-colors ${
          role === "citizen"
            ? "bg-teal-50 border-teal-200 text-teal-900"
            : role === "staff"
            ? "bg-sky-50 border-sky-200 text-sky-900"
            : "bg-indigo-50 border-indigo-200 text-indigo-900"
        }`}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                role === "citizen" ? "bg-teal-500" : role === "staff" ? "bg-sky-500" : "bg-indigo-500"
              }`}
            />
            <span className="font-semibold">Active Persona:</span>
            <span className="font-bold">
              {role === "citizen"
                ? "Gayatri Tanisha Bitasta (Citizen Lake Guardian)"
                : role === "staff"
                ? "Dr. Suseela, AE (CCMC Field Operations)"
                : "ICCC (Integrated Command & Control Centre)"}
            </span>
            <span className="text-[11px] opacity-75 hidden sm:inline">
              — {role === "citizen" ? "Reporting & Local Watch Mode" : role === "staff" ? "Work Orders & Status Triage Mode" : "Municipal Command & Dispatch Mode"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="font-bold underline underline-offset-2 hover:opacity-80 text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Switch Persona</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <Link
              to="/"
              className="text-[11px] font-medium opacity-80 hover:opacity-100 hover:underline hidden md:inline"
            >
              Landing Portal
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-teal-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900">
                Coimbatore CleanWater
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                GIS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Noyyal Basin Lake Monitoring
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? role === "citizen"
                      ? "bg-teal-50 text-teal-800 font-bold"
                      : role === "staff"
                      ? "bg-sky-50 text-sky-800 font-bold"
                      : "bg-indigo-50 text-indigo-800 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? (role === "citizen" ? "text-teal-600" : role === "staff" ? "text-sky-600" : "text-indigo-600") : "text-slate-400"}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Report Issue CTA (Highlight for Citizen) */}
          <Link
            to="/report"
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Issue</span>
          </Link>

          {/* Quick Role Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                role === "citizen"
                  ? "border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100"
                  : role === "staff"
                  ? "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100"
                  : "border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
              }`}
              title="Switch demo user persona"
            >
              {role === "citizen" ? (
                <UserIcon className="w-3.5 h-3.5 text-teal-600" />
              ) : role === "staff" ? (
                <Wrench className="w-3.5 h-3.5 text-sky-600" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span className="capitalize">{role}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Select Persona (Instantly Updates Workspace)
                </div>

                {/* Citizen Option */}
                <button
                  onClick={() => handlePersonaSwitch("citizen")}
                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                    role === "citizen" ? "bg-teal-50/70 border-l-4 border-teal-500" : ""
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Citizen (Gayatri)</span>
                      {role === "citizen" && (
                        <span className="text-[9px] bg-teal-200 text-teal-800 px-1.5 py-0.2 rounded font-bold">Active</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Submissions tracker, lake health advisory, community report wizard
                    </div>
                  </div>
                  {role === "citizen" && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                </button>

                {/* Staff Option */}
                <button
                  onClick={() => handlePersonaSwitch("staff")}
                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                    role === "staff" ? "bg-sky-50/70 border-l-4 border-sky-500" : ""
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Field Staff (Dr. Suseela AE)</span>
                      {role === "staff" && (
                        <span className="text-[9px] bg-sky-200 text-sky-800 px-1.5 py-0.2 rounded font-bold">Active</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Field work orders, interactive Kanban, 1-click status & cleanup notes
                    </div>
                  </div>
                  {role === "staff" && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                </button>

                {/* Admin Option */}
                <button
                  onClick={() => handlePersonaSwitch("admin")}
                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                    role === "admin" ? "bg-indigo-50/70 border-l-4 border-indigo-500" : ""
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>ICCC Command (Admin)</span>
                      {role === "admin" && (
                        <span className="text-[9px] bg-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded font-bold">Active</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Executive Command Center, staff dispatcher, basin spread matrix
                    </div>
                  </div>
                  {role === "admin" && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>

                <div className="pt-2 mt-1 border-t border-slate-100 px-3 pb-1">
                  <Link
                    to="/"
                    onClick={() => setShowRoleMenu(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center justify-between font-medium"
                  >
                    <span>Back to Lake Landing Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-100">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">In-App Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No notifications yet.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.is_read ? "bg-sky-50/40" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold ${!n.is_read ? "text-sky-900" : "text-slate-700"}`}>
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1.5 block">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden border-t border-slate-200 px-4 py-2 flex items-center justify-around bg-slate-50">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to));
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                active
                  ? role === "citizen"
                    ? "text-teal-700"
                    : role === "staff"
                    ? "text-sky-700"
                    : "text-indigo-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
