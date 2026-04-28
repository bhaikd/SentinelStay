import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAppStore } from './store/appStore';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import GuestLayout from './layouts/GuestLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import SOSPortal from './pages/guest/SOSPortal';
import GuestChat from './pages/guest/GuestChat';
import StaffDashboard from './pages/staff/StaffDashboard';
import CommandCenter from './pages/command/CommandCenter';
import IncidentLog from './pages/command/IncidentLog';
import GuestRoster from './pages/command/GuestRoster';
import BuildingData from './pages/command/BuildingData';
import ResponderPortal from './pages/responder/ResponderPortal';
import CorporateDashboard from './pages/corporate/CorporateDashboard';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';

function App() {
  const { hydrate, isLoading } = useAppStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-blue-500">
        <span className="material-symbols-outlined animate-spin text-4xl">autorenew</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Guest Flow (public / anon auth handled internally if needed) */}
        <Route element={<GuestLayout />}>
          <Route path="/guest/sos" element={<SOSPortal />} />
          <Route path="/guest/chat" element={<GuestChat />} />
        </Route>

        {/* Protected Staff & Command Routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/command" element={<CommandCenter />} />
          <Route path="/command/incidents" element={<IncidentLog />} />
          <Route path="/command/guests" element={<GuestRoster />} />
          <Route path="/command/building" element={<BuildingData />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Protected Standalone Pages */}
        <Route path="/responder" element={<ProtectedRoute><ResponderPortal /></ProtectedRoute>} />
        <Route path="/corporate" element={<ProtectedRoute><CorporateDashboard /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
