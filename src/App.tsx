import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Header } from "./components/Header";
import { DisclaimerBanner } from "./components/DisclaimerBanner";
import { LandingPage } from "./pages/LandingPage";
import { CitizenPortalPage } from "./pages/CitizenPortalPage";
import { StaffPortalPage } from "./pages/StaffPortalPage";
import { AdminPortalPage } from "./pages/AdminPortalPage";
import { MapPage } from "./pages/MapPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { IncidentDetailPage } from "./pages/IncidentDetailPage";
import { ReportIssuePage } from "./pages/ReportIssuePage";
import { LakesPage } from "./pages/LakesPage";
import { LakeDetailPage } from "./pages/LakeDetailPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {!isLandingPage && <DisclaimerBanner />}
      {!isLandingPage && <Header />}
      <main className="flex-1 w-full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/citizen" element={<CitizenPortalPage />} />
          <Route path="/staff" element={<StaffPortalPage />} />
          <Route path="/admin" element={<AdminPortalPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/report" element={<ReportIssuePage />} />
          <Route path="/lakes" element={<LakesPage />} />
          <Route path="/lakes/:id" element={<LakeDetailPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
