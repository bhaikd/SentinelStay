import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { severityLabel, severityColor, statusColor, roleColor, formatElapsed } from '../../utils/formatting';

const FILTER_LABELS = { all: 'All', active: 'Active', acknowledged: 'Acknowledged' } as const;

export default function StaffDashboard() {
  const {
    incidents, staff, alerts, guests,
    acknowledgeAlert, respondToIncident, escalateIncident, resolveIncident,
    elapsedSeconds,
  } = useAppStore();

  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('all');
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; color: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const addToast = useCallback((msg: string, color = 'bg-primary') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, msg, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const activeIncidents = incidents.filter((i) => i.status === 'active' || i.status === 'responding');
  const myUnit = staff.find((s) => s.id === 'U02'); // Sarah Kim

  const filteredAlerts = alerts.filter((a) => {
    const matchFilter =
      filter === 'active' ? !a.acknowledged :
      filter === 'acknowledged' ? a.acknowledged : true;
    const matchSearch = a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleAcknowledge = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    acknowledgeAlert(alertId);
    addToast('Alert acknowledged.', 'bg-primary');
  };

  const handleRespond = (alert: typeof alerts[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (alert.incidentId) respondToIncident(alert.incidentId);
    acknowledgeAlert(alert.id);
    addToast(`Responding to ${alert.incidentId || 'incident'}...`, 'bg-amber-500');
  };

  const handleEscalate = (alert: typeof alerts[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (alert.incidentId) escalateIncident(alert.incidentId);
    addToast('Incident escalated to next severity level.', 'bg-tertiary-container');
  };

  const handleResolve = (incidentId: string) => {
    resolveIncident(incidentId);
    addToast(`${incidentId} marked resolved.`, 'bg-emerald-600');
  };

  return (
    <div className="h-full flex overflow-hidden relative">
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              className={`${t.color} text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2`}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Alert Feed */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Staff Dashboard</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">Alert Management & Response Operations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <span className={`w-2 h-2 rounded-full ${statusColor('available')}`} />
              <span className="text-xs font-semibold text-emerald-700">On Duty — {myUnit?.name}</span>
            </div>
            <button className="bg-tertiary text-on-tertiary px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>sos</span>
              Staff SOS
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Active Incidents', value: activeIncidents.length, icon: 'crisis_alert', color: 'text-tertiary', bg: 'bg-red-50' },
            { label: 'Unacknowledged', value: alerts.filter((a) => !a.acknowledged).length, icon: 'notifications_active', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Staff On Duty', value: staff.filter((s) => s.status !== 'off-duty').length, icon: 'groups', color: 'text-primary', bg: 'bg-blue-50' },
            { label: 'Elapsed', value: formatElapsed(elapsedSeconds), icon: 'timer', color: 'text-on-surface-variant', bg: 'bg-surface-container' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-outline-variant/10 shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`material-symbols-outlined text-lg ${stat.color}`}>{stat.icon}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold text-on-surface">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(Object.keys(FILTER_LABELS) as Array<keyof typeof FILTER_LABELS>).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'}`}
              >
                {FILTER_LABELS[f]}
                {f === 'active' && alerts.filter((a) => !a.acknowledged).length > 0 && (
                  <span className="ml-1.5 bg-tertiary-container text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold">
                    {alerts.filter((a) => !a.acknowledged).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Feed */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          <AnimatePresence>
            {filteredAlerts.map((alert, i) => {
              const isExpanded = expandedAlert === alert.id;
              const linkedIncident = incidents.find((inc) => inc.id === alert.incidentId);
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-surface-container-lowest rounded-xl border transition-all cursor-pointer ${
                    !alert.acknowledged
                      ? 'border-l-4 border-l-tertiary-container border-outline-variant/10 shadow-sm'
                      : 'border-outline-variant/10'
                  } ${isExpanded ? 'ring-2 ring-primary/30' : ''}`}
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          alert.severity >= 3 ? 'bg-red-100 text-tertiary' : alert.severity === 2 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {alert.type === 'sensor' ? 'sensors' : alert.type === 'sos' ? 'sos' : alert.type === 'staff' ? 'person_alert' : 'monitoring'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate ${alert.acknowledged ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">location_on</span>
                              {alert.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">schedule</span>
                              {alert.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${severityColor(alert.severity)}`}>
                          {severityLabel(alert.severity).split(' ')[0]}
                        </span>
                        {alert.acknowledged && (
                          <span className="material-symbols-outlined text-emerald-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        )}
                        <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </div>

                    {/* Expanded: actions + incident link */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {linkedIncident && (
                            <div className="mt-3 p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant">
                              <span className="font-semibold text-on-surface">Linked: </span>
                              {linkedIncident.id} — {linkedIncident.title}
                              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${linkedIncident.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {linkedIncident.status}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-2 mt-3 pt-2 border-t border-outline-variant/10">
                            {!alert.acknowledged && (
                              <button
                                onClick={(e) => handleAcknowledge(alert.id, e)}
                                className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-sm">check</span>
                                Acknowledge
                              </button>
                            )}
                            {!alert.acknowledged && (
                              <button
                                onClick={(e) => handleRespond(alert, e)}
                                className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-sm">directions_run</span>
                                Respond
                              </button>
                            )}
                            <button
                              onClick={(e) => handleEscalate(alert, e)}
                              className="bg-surface-container text-on-surface-variant px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-surface-variant transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">keyboard_double_arrow_up</span>
                              Escalate
                            </button>
                            {linkedIncident && linkedIncident.status !== 'resolved' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleResolve(linkedIncident.id); }}
                                className="ml-auto bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-200 transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredAlerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-3 opacity-30">notifications_off</span>
              <p className="text-sm font-medium">No alerts match your filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-[340px] h-full bg-surface-container-lowest border-l border-outline-variant/10 flex flex-col overflow-hidden shrink-0 hidden xl:flex">
        {/* Active Incidents */}
        <div className="flex-1 overflow-y-auto p-5">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-tertiary">crisis_alert</span>
            Active Incidents
          </h2>
          <div className="space-y-3">
            {activeIncidents.map((inc) => (
              <div key={inc.id} className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${severityColor(inc.severity)}`}>
                    {inc.severity === 4 ? 'CRITICAL' : inc.severity === 3 ? 'HIGH' : 'MEDIUM'}
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant">{inc.id}</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface mb-1">{inc.title}</h3>
                <p className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  {inc.location.building}, Floor {inc.location.floor}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">engineering</span>
                    {inc.assignedUnits.length} units
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ml-auto ${inc.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {inc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Staff Roster */}
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-6 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">groups</span>
            On-Duty Staff ({staff.filter((s) => s.status !== 'off-duty').length})
          </h2>
          <div className="space-y-1.5">
            {staff.filter((s) => s.status !== 'off-duty').map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${statusColor(s.status)}`} />
                  <div>
                    <p className="text-sm text-on-surface font-medium">{s.name}</p>
                    <p className="text-[10px] text-on-surface-variant">{s.status.replace('-', ' ')}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleColor(s.role)}`}>
                  {s.role}
                </span>
              </div>
            ))}
          </div>

          {/* Guests */}
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-6 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-amber-600">person_search</span>
            Missing Guests ({guests.filter((g) => g.status === 'missing').length})
          </h2>
          <div className="space-y-2">
            {guests.filter((g) => g.status === 'missing').map((g) => (
              <div key={g.id} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <p className="text-sm font-bold text-amber-800">{g.name}</p>
                <p className="text-xs text-amber-600">Room {g.room} • Last seen: {g.lastSeen}</p>
                {g.accessibility.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {g.accessibility.map((a) => (
                      <span key={a} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {guests.filter((g) => g.status === 'missing').length === 0 && (
              <p className="text-sm text-emerald-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                All guests accounted for
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
