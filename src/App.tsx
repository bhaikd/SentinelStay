import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import GuestLayout from './layouts/GuestLayout';

// Eagerly-loaded routes (light weight, top of funnel)
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import SOSPortal from './pages/guest/SOSPortal';
import GuestChat from './pages/guest/GuestChat';

// Lazy-loaded routes (heavy dashboards, charts, etc.)
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const CommandCenter = lazy(() => import('./pages/command/CommandCenter'));
const IncidentLog = lazy(() => import('./pages/command/IncidentLog'));
const GuestRoster = lazy(() => import('./pages/command/GuestRoster'));
const BuildingData = lazy(() => import('./pages/command/BuildingData'));
const Channels = lazy(() => import('./pages/command/Channels'));
const ResponderPortal = lazy(() => import('./pages/responder/ResponderPortal'));
const CorporateDashboard = lazy(() => import('./pages/corporate/CorporateDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/analytics/AnalyticsDashboard'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const Settings = lazy(() => import('./pages/settings/Settings'));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 text-blue-500">
    <span className="material-symbols-outlined animate-spin text-4xl" aria-label="Loading">autorenew</span>
  </div>
);

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
      <Suspense fallback={<RouteFallback />}>
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
          <Route path="/command/channels" element={<Channels />} />
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
