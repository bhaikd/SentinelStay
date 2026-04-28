import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { buildingData } from '../../data/mockData';
import { formatElapsed, typeIcon, severityColor, severityLabel } from '../../utils/formatting';

export default function ResponderPortal() {
  const { incidents, staff, guests, elapsedSeconds } = useAppStore();
  const activeIncident = incidents[0];
  const deployedStaff = activeIncident ? staff.filter((s) => s.currentIncident === activeIncident.id) : [];
  const affectedGuests = activeIncident ? guests.filter((g) => g.floor === activeIncident.location.floor) : [];

  if (!activeIncident) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-6xl text-emerald-500 mb-4">check_circle</span>
        <h2 className="text-2xl font-bold">No Active Emergencies</h2>
        <p className="text-slate-400 mt-2">All systems operating normally. Monitoring for incidents.</p>
        <Link to="/" className="mt-6 text-sm text-blue-400 hover:text-blue-300 underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
            <span className="text-lg font-bold tracking-tight">SentinelStay</span>
          </Link>
          <span className="text-slate-600 mx-2">|</span>
          <span className="text-sm text-orange-400 font-semibold">Emergency Services Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="material-symbols-outlined text-sm">lock</span>
            Secure Access • Expires in 4h 22m
          </div>
          <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE INCIDENT
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left: Building Data */}
        <div className="w-[360px] border-r border-slate-800 overflow-y-auto p-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Building Information</h2>

          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-4">
            <h3 className="text-base font-bold text-white mb-3">{buildingData.name}</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Address', value: buildingData.address, icon: 'location_on' },
                { label: 'Floors', value: buildingData.floors.toString(), icon: 'layers' },
                { label: 'Total Rooms', value: buildingData.rooms.toString(), icon: 'door_front' },
                { label: 'Total Area', value: buildingData.totalArea, icon: 'square_foot' },
                { label: 'Built', value: buildingData.builtYear.toString(), icon: 'calendar_today' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-sm">{item.icon}</span>
                    {item.label}
                  </span>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Systems */}
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">Safety Systems</h2>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Fire Suppression</span>
              <span className="text-emerald-400 font-medium">{buildingData.fireSuppressionSystem}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Emergency Exits</span>
              <span className="text-white font-medium">{buildingData.emergencyExits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Elevators</span>
              <span className="text-white font-medium">{buildingData.elevators}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stairwells</span>
              <span className="text-white font-medium">{buildingData.stairwells}</span>
            </div>
          </div>

          {/* Shut-Off Valves */}
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">Shut-Off Locations</h2>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3 text-sm">
            {Object.entries(buildingData.shutOffValves).map(([key, val]) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-400 capitalize">{key}</span>
                <span className="text-amber-400 font-medium">{val}</span>
              </div>
            ))}
          </div>

          {/* Hazmat */}
          <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 mt-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">warning</span>
            Hazmat Locations
          </h2>
          <div className="bg-red-950/30 rounded-xl p-4 border border-red-900/30 space-y-2">
            {buildingData.hazmatLocations.map((loc) => (
              <div key={loc} className="flex items-center gap-2 text-sm text-red-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {loc}
              </div>
            ))}
          </div>

          {/* Assembly Points */}
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">Assembly Points</h2>
          <div className="bg-emerald-950/30 rounded-xl p-4 border border-emerald-900/30 text-sm text-emerald-300">
            {buildingData.assembled}
          </div>
        </div>

        {/* Center: Active Incident */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Incident Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{typeIcon(activeIncident.type)}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{activeIncident.title}</h2>
                  <p className="text-sm text-slate-400">{activeIncident.id} • {activeIncident.location.building}, Floor {activeIncident.location.floor}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${severityColor(activeIncident.severity)}`}>
                  {severityLabel(activeIncident.severity)}
                </span>
                <div className="text-sm font-mono text-slate-400 mt-2">{formatElapsed(elapsedSeconds)} elapsed</div>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">{activeIncident.description}</p>

            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Guests Affected', value: activeIncident.guestsAffected, color: 'text-white' },
                { label: 'Evacuated', value: activeIncident.evacuated, color: 'text-emerald-400' },
                { label: 'Casualties', value: activeIncident.casualties, color: 'text-red-400' },
                { label: 'Units Deployed', value: deployedStaff.length, color: 'text-blue-400' },
              ].map((m) => (
                <div key={m.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{m.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Floor Plan Reference */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">map</span>
              Floor {activeIncident.location.floor} Layout — Incident Location
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-4 relative overflow-hidden" style={{ minHeight: '280px' }}>
              <svg viewBox="0 0 800 280" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <pattern id="respGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="800" height="280" fill="url(#respGrid)" />
                {/* Simplified floor plan */}
                <rect x="20" y="20" width="760" height="240" fill="none" stroke="#475569" strokeWidth="2" rx="4" />
                {/* Rooms top row */}
                {[0,1,2,3,4,5].map((i) => (
                  <g key={`top-${i}`}>
                    <rect x={40 + i * 120} y={30} width={100} height={60} fill={i === 1 ? '#451a1a' : '#1e293b'} stroke={i === 1 ? '#ef4444' : '#475569'} strokeWidth={i === 1 ? 2 : 1} rx="3" />
                    <text x={90 + i * 120} y={65} textAnchor="middle" fontSize="11" fill={i === 1 ? '#ef4444' : '#94a3b8'} fontWeight="600" fontFamily="Inter">140{i + 1}</text>
                  </g>
                ))}
                {/* Corridor */}
                <rect x={40} y={110} width={700} height={60} fill="#0f172a" stroke="#334155" strokeWidth="1" rx="3" />
                <text x={390} y={145} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="Inter">CORRIDOR</text>
                {/* Rooms bottom row */}
                {[0,1,2,3,4,5].map((i) => (
                  <g key={`bot-${i}`}>
                    <rect x={40 + i * 120} y={190} width={100} height={60} fill="#1e293b" stroke="#475569" strokeWidth="1" rx="3" />
                    <text x={90 + i * 120} y={225} textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="600" fontFamily="Inter">140{i + 7}</text>
                  </g>
                ))}
                {/* Incident marker */}
                <circle cx={210} cy={60} r="18" fill="#ef4444" opacity="0.2">
                  <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={210} cy={60} r="10" fill="#ef4444" />
                <text x={210} y={64} textAnchor="middle" fontSize="12" fill="white">🔥</text>
              </svg>
            </div>
          </div>

          {/* Live Timeline */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">history</span>
              Live Incident Timeline
            </h3>
            <div className="relative border-l-2 border-slate-700 ml-3 space-y-4">
              {activeIncident.timeline.map((event) => {
                const dotColor = event.type === 'alert' ? 'bg-red-500' :
                  event.type === 'escalation' ? 'bg-amber-500' :
                  event.type === 'dispatch' ? 'bg-blue-500' :
                  'bg-emerald-500';

                return (
                  <div key={event.id} className="relative pl-6">
                    <div className={`absolute w-3 h-3 ${dotColor} rounded-full -left-[7px] top-1.5 shadow-[0_0_0_3px_#0f172a]`} />
                    <p className="text-xs font-mono text-slate-500">{event.timestamp}</p>
                    <p className={`text-sm ${event.type === 'alert' ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                      {event.message}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Guest Info */}
        <div className="w-[300px] border-l border-slate-800 overflow-y-auto p-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            Affected Guests — Floor {activeIncident.location.floor}
          </h2>

          <div className="space-y-2">
            {affectedGuests.map((g) => (
              <div key={g.id} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{g.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    g.status === 'evacuated' ? 'bg-emerald-500/20 text-emerald-400' :
                    g.status === 'missing' ? 'bg-amber-500/20 text-amber-400' :
                    g.status === 'in-room' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {g.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-0.5">
                  <div>Room {g.room} • {g.language}</div>
                  {g.accessibility.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {g.accessibility.map((a) => (
                        <span key={a} className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-1">Last seen: {g.lastSeen}</div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-6 mb-4">On-Scene Units</h2>
          <div className="space-y-2">
            {deployedStaff.map((s) => (
              <div key={s.id} className="bg-slate-900 rounded-lg p-3 border border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  {s.unit.replace('Unit ', 'U')}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{s.role} • {s.eta || 'On Scene'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
