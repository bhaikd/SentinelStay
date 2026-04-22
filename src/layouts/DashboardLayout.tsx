import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { formatElapsed } from '../utils/formatting';

const navItems = [
  { label: 'Command Center', icon: 'security', path: '/command' },
  { label: 'Incident Log', icon: 'list_alt', path: '/command/incidents' },
  { label: 'Guest Roster', icon: 'groups', path: '/command/guests' },
  { label: 'Building Data', icon: 'domain', path: '/command/building' },
  { label: 'Staff Dashboard', icon: 'badge', path: '/staff' },
];

const externalNav = [
  { label: 'Analytics', icon: 'analytics', path: '/analytics' },
  { label: 'Corporate', icon: 'corporate_fare', path: '/corporate' },
  { label: 'Responder Portal', icon: 'local_fire_department', path: '/responder' },
];

export default function DashboardLayout() {
  const { conditionLevel, incidents, staff, elapsedSeconds } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [drillMode, setDrillMode] = useState(false);

  const activeIncidents = incidents.filter((i) => i.status === 'active' || i.status === 'responding');
  const deployedStaff = staff.filter((s) => s.status === 'deployed' || s.status === 'en-route');
  const primaryIncident = incidents[0];

  const conditionDotClass = conditionLevel === 'red'
    ? 'bg-tertiary-container animate-pulse shadow-[0_0_8px_rgba(180,23,25,0.6)]'
    : conditionLevel === 'yellow'
    ? 'bg-amber-500 animate-pulse'
    : 'bg-emerald-500';

  const handleDispatch = () => {
    setDispatched(true);
    setTimeout(() => {
      setShowDispatchModal(false);
      setDispatched(false);
    }, 2500);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-surface text-on-surface font-body">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-5 h-16 bg-slate-50/90 backdrop-blur-xl shadow-sm border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
          <span className="text-lg font-bold tracking-tight text-primary">SentinelStay</span>
        </div>

        {/* Center Status */}
        <div className="hidden md:flex items-center gap-5">
          {drillMode && (
            <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
              <span className="material-symbols-outlined text-sm">sports_esports</span>
              DRILL MODE — Alerts Simulated
            </div>
          )}
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${conditionDotClass}`} />
            <span className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
              {conditionLevel === 'red' ? 'Condition Red' : conditionLevel === 'yellow' ? 'Condition Yellow' : 'All Clear'}
            </span>
          </div>
          <div className="h-5 w-px bg-outline-variant opacity-30" />
          <div className="flex gap-4 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">Active</span>
              <span className="text-on-surface font-semibold leading-tight">{activeIncidents.length} Incidents</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">Staff</span>
              <span className="text-on-surface font-semibold leading-tight">{deployedStaff.length} Deployed</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">Elapsed</span>
              <span className="text-on-surface font-mono font-semibold leading-tight">{formatElapsed(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Drill Mode Toggle */}
          <button
            onClick={() => setDrillMode(!drillMode)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              drillMode ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">sports_esports</span>
            <span className="hidden sm:inline">Drill</span>
          </button>

          <button
            onClick={() => setShowDispatchModal(true)}
            className="bg-tertiary text-on-tertiary px-4 py-2 rounded-lg font-bold text-sm shadow-[0_4px_14px_rgba(141,0,10,0.3)] hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>phone_in_talk</span>
            <span className="hidden sm:inline">DISPATCH 911</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center cursor-pointer hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">account_circle</span>
          </div>
        </div>
      </header>

      <div className="flex h-full pt-16">
        {/* Navigation Sidebar */}
        <nav className="hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 w-64 bg-slate-50 border-r border-slate-200">
          {/* Profile */}
          <div className="px-5 py-5 border-b border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-on-surface">Commander Alpha</h2>
                <p className="text-xs text-on-surface-variant">SentinelStay Central</p>
                <p className="text-[10px] text-primary font-semibold tracking-wider uppercase mt-0.5">Active Duty</p>
              </div>
            </div>
          </div>

          {/* Main Nav */}
          <div className="flex flex-col flex-1 mt-1 overflow-y-auto">
            <div className="px-3 py-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">Operations</p>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xl ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                      {item.icon}
                    </span>
                    {item.label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </NavLink>
                );
              })}
            </div>

            <div className="px-3 py-2 border-t border-slate-200/60 mt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">Other Views</p>
              {externalNav.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all mb-0.5"
                >
                  <span className="material-symbols-outlined text-xl text-slate-400">{item.icon}</span>
                  {item.label}
                  <span className="material-symbols-outlined text-slate-300 text-sm ml-auto">open_in_new</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-slate-200/60">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-all">
              <span className="material-symbols-outlined text-xl text-slate-400">settings</span>
              Settings
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 overflow-hidden bg-surface-container-low">
          <Outlet />
        </main>
      </div>

      {/* 911 Dispatch Modal */}
      <AnimatePresence>
        {showDispatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowDispatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {!dispatched ? (
                <>
                  {/* Modal Header */}
                  <div className="bg-tertiary p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>phone_in_talk</span>
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-white">DISPATCH 911</h2>
                          <p className="text-xs text-red-200">Emergency Services Notification</p>
                        </div>
                      </div>
                      <button onClick={() => setShowDispatchModal(false)} className="text-white/60 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>

                  {/* Incident Payload Preview */}
                  <div className="p-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Structured Dispatch Payload</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-sm font-mono mb-5">
                      {[
                        { label: 'Incident Type', value: primaryIncident.type.toUpperCase() },
                        { label: 'Severity', value: `Level ${primaryIncident.severity} — Critical` },
                        { label: 'Location', value: `${primaryIncident.location.building}, Floor ${primaryIncident.location.floor}, Room ${primaryIncident.location.room}` },
                        { label: 'Casualties', value: primaryIncident.casualties.toString() },
                        { label: 'Guests Affected', value: primaryIncident.guestsAffected.toString() },
                        { label: 'Duration', value: formatElapsed(elapsedSeconds) },
                        { label: 'Address', value: '350 5th Avenue, New York, NY 10118' },
                        { label: 'Contact', value: 'SentinelStay Command — +1 (555) 911-0042' },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between gap-4">
                          <span className="text-slate-400">{row.label}:</span>
                          <span className="text-slate-800 font-semibold text-right">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2 text-amber-700 text-xs">
                      <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
                      This will immediately contact emergency services. Confirm only if this is a real emergency.
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDispatchModal(false)}
                        className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDispatch}
                        className="flex-1 bg-tertiary text-white font-black py-3 rounded-xl shadow-lg shadow-red-500/30 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>phone_in_talk</span>
                        CONFIRM DISPATCH
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-emerald-500 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">911 Dispatched</h3>
                  <p className="text-sm text-slate-500">Emergency services have been notified. Incident payload sent.</p>
                  <div className="mt-4 text-xs text-slate-400 font-mono">Reference: CAD-{Date.now().toString().slice(-6)}</div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
