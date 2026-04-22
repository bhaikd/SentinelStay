import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { formatElapsed, severityColor, severityLabel, typeIcon } from '../../utils/formatting';

const floors = Array.from({ length: 18 }, (_, i) => i + 1).reverse();

// SVG floor plan rooms for Floor 14
const floorRooms = [
  { id: '1401', x: 40, y: 60, w: 100, h: 70, label: '1401' },
  { id: '1402', x: 160, y: 60, w: 100, h: 70, label: '1402', alert: true },
  { id: '1403', x: 280, y: 60, w: 100, h: 70, label: '1403' },
  { id: '1404', x: 400, y: 60, w: 100, h: 70, label: '1404' },
  { id: '1405', x: 520, y: 60, w: 100, h: 70, label: '1405' },
  { id: '1406', x: 640, y: 60, w: 100, h: 70, label: '1406' },
  { id: '1407', x: 40, y: 280, w: 100, h: 70, label: '1407' },
  { id: '1408', x: 160, y: 280, w: 100, h: 70, label: '1408' },
  { id: '1409', x: 280, y: 280, w: 100, h: 70, label: '1409' },
  { id: '1410', x: 400, y: 280, w: 100, h: 70, label: '1410' },
  { id: '1411', x: 520, y: 280, w: 100, h: 70, label: '1411' },
  { id: '1412', x: 640, y: 280, w: 100, h: 70, label: '1412' },
];

const corridors = [
  { x: 40, y: 150, w: 700, h: 110 },
];

const facilities = [
  { x: 760, y: 60, w: 60, h: 70, label: 'Elev A', icon: 'elevator' },
  { x: 760, y: 150, w: 60, h: 50, label: 'Stairs', icon: 'stairs' },
  { x: 760, y: 220, w: 60, h: 50, label: 'Stairs', icon: 'stairs' },
  { x: 760, y: 280, w: 60, h: 70, label: 'Elev B', icon: 'elevator' },
];

export default function CommandCenter() {
  const { incidents, staff, guests, currentFloor, setCurrentFloor, elapsedSeconds, addTimelineEvent } = useAppStore();

  const [selectedIncident, setSelectedIncident] = useState(incidents[0]);
  const [logInput, setLogInput] = useState('');
  const [showGuestPanel, setShowGuestPanel] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeIncident = incidents.find((i) => i.id === selectedIncident.id) || incidents[0];
  const deployedStaff = staff.filter((s) => s.currentIncident === activeIncident.id);
  const affectedGuests = guests.filter((g) => g.floor === currentFloor);
  const missingGuests = affectedGuests.filter((g) => g.status === 'missing');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAddLog = () => {
    if (!logInput.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    addTimelineEvent(activeIncident.id, {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      message: logInput.trim(),
      type: 'update',
      author: 'Commander Alpha',
    });
    setLogInput('');
    showToast('Log entry added to timeline.');
  };

  return (
    <div className="h-full flex overflow-hidden relative">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-primary text-on-primary text-sm font-semibold px-5 py-3 rounded-xl shadow-xl flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main Map Area */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        {/* Top Bar */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              Tower A — Floor {currentFloor}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">Live Telemetry & Tracking</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Floor Selector */}
            <div className="flex items-center gap-1 bg-surface-container-highest rounded-lg p-1">
              <button
                onClick={() => setCurrentFloor(Math.min(18, currentFloor + 1))}
                className="p-1.5 rounded hover:bg-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface text-lg">keyboard_arrow_up</span>
              </button>
              <span className="text-sm font-bold text-on-surface w-6 text-center">{currentFloor}</span>
              <button
                onClick={() => setCurrentFloor(Math.max(1, currentFloor - 1))}
                className="p-1.5 rounded hover:bg-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface text-lg">keyboard_arrow_down</span>
              </button>
            </div>
            <button className="bg-surface-container-highest text-on-surface p-2 rounded-lg shadow-sm hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
            <button className="bg-surface-container-highest text-on-surface p-2 rounded-lg shadow-sm hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">zoom_out</span>
            </button>
            <button className="bg-surface-container-highest text-on-surface p-2 rounded-lg shadow-sm hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">layers</span>
            </button>
            <button
              onClick={() => setShowGuestPanel(!showGuestPanel)}
              className={`p-2 rounded-lg shadow-sm transition-colors ${showGuestPanel ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface hover:bg-surface-variant'}`}
            >
              <span className="material-symbols-outlined">groups</span>
            </button>
          </div>
        </div>

        {/* Floor Plan SVG */}
        <div className="flex-1 bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden border border-outline-variant/10">
          <svg viewBox="0 0 860 410" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5" />
              </pattern>
              {/* Evacuation arrow marker */}
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#00C853" />
              </marker>
            </defs>
            <rect width="860" height="410" fill="url(#grid)" />

            {/* Corridors */}
            {corridors.map((c, i) => (
              <rect key={`corr-${i}`} x={c.x} y={c.y} width={c.w} height={c.h} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="4" />
            ))}
            {/* Corridor label */}
            <text x="390" y="210" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="500" fontFamily="Inter">MAIN CORRIDOR</text>

            {/* Rooms */}
            {floorRooms.map((room) => (
              <g key={room.id}>
                <rect
                  x={room.x} y={room.y} width={room.w} height={room.h}
                  fill={room.alert ? '#fef2f2' : '#ffffff'}
                  stroke={room.alert ? '#b41719' : '#e2e8f0'}
                  strokeWidth={room.alert ? 2 : 1}
                  rx="4"
                  className="room-hover"
                />
                <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 4} textAnchor="middle" fontSize="12" fill={room.alert ? '#b41719' : '#64748b'} fontWeight={room.alert ? '700' : '500'} fontFamily="Inter">
                  {room.label}
                </text>
                {/* Room status indicators */}
                {room.id === '1401' && (
                  <circle cx={room.x + room.w - 10} cy={room.y + 10} r="4" fill="#ef4444">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            ))}

            {/* Facilities */}
            {facilities.map((f, i) => (
              <g key={`fac-${i}`}>
                <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" rx="4" />
                <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 3} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="500" fontFamily="Inter">{f.label}</text>
              </g>
            ))}

            {/* Fire Incident Marker */}
            <g>
              <circle cx="210" cy="95" r="22" fill="#b41719" opacity="0.12">
                <animate attributeName="r" values="22;30;22" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.12;0.04;0.12" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="210" cy="95" r="14" fill="#b41719" />
              <text x="210" y="99" textAnchor="middle" fontSize="14" fill="white" fontFamily="Material Symbols Outlined">🔥</text>
            </g>

            {/* Staff markers */}
            {/* Unit 04 — On Scene */}
            <g>
              <circle cx="280" cy="190" r="10" fill="#0052cc" />
              <text x="280" y="194" textAnchor="middle" fontSize="8" fill="white" fontWeight="700" fontFamily="Inter">04</text>
              <rect x="295" y="180" width="110" height="22" rx="11" fill="white" stroke="#e2e8f0" strokeWidth="1" />
              <circle cx="304" cy="191" r="4" fill="#0052cc" />
              <text x="312" y="195" fontSize="9" fill="#1e293b" fontWeight="600" fontFamily="Inter">Unit 04 (Maint.)</text>
            </g>

            {/* Unit 12 — En Route */}
            <g>
              <circle cx="500" cy="190" r="10" fill="#525f73" />
              <text x="500" y="194" textAnchor="middle" fontSize="8" fill="white" fontWeight="700" fontFamily="Inter">12</text>
              <rect x="515" y="180" width="120" height="22" rx="11" fill="white" stroke="#e2e8f0" strokeWidth="1" />
              <circle cx="524" cy="191" r="4" fill="#525f73" />
              <text x="532" y="195" fontSize="9" fill="#1e293b" fontWeight="600" fontFamily="Inter">Unit 12 (Security)</text>
            </g>

            {/* Evacuation Route */}
            <path
              d="M 210 130 L 210 200 L 390 200 L 390 260 L 760 260 L 760 200"
              fill="none"
              stroke="#00C853"
              strokeWidth="3"
              strokeDasharray="8 6"
              markerEnd="url(#arrowhead)"
              opacity="0.7"
            >
              <animate attributeName="stroke-dashoffset" values="0;-28" dur="1.5s" repeatCount="indefinite" />
            </path>
            <text x="550" y="250" fontSize="9" fill="#00C853" fontWeight="600" fontFamily="Inter">EVACUATION ROUTE →</text>

            {/* Missing guest indicator */}
            <g>
              <circle cx="90" cy="95" r="8" fill="#f59e0b" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <text x="90" y="99" textAnchor="middle" fontSize="10" fill="white" fontWeight="700">!</text>
              <text x="90" y="55" textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="600" fontFamily="Inter">MISSING</text>
              <text x="90" y="45" textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="500" fontFamily="Inter">Rm 1401</text>
            </g>
          </svg>

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-on-surface-variant bg-surface-container-lowest/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-outline-variant/10">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" /> Incident</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary-container" /> Staff</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Missing</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-safe" /> Evac Route</span>
          </div>

          {/* Incident quick-select tabs */}
          <div className="absolute top-3 left-3 flex gap-2">
            {incidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => { setSelectedIncident(inc); setCurrentFloor(inc.location.floor); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
                  selectedIncident.id === inc.id
                    ? 'bg-tertiary-container text-white shadow-tertiary-container/30'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant border border-outline-variant/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{typeIcon(inc.type)}</span>
                {inc.id}
                {(inc.status === 'active') && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Guest Panel (toggleable overlay) */}
      {showGuestPanel && (
        <motion.aside
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-[320px] h-full bg-surface-container-lowest border-l border-outline-variant/10 p-4 overflow-y-auto shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">groups</span>
              Floor {currentFloor} Guests ({affectedGuests.length})
            </h3>
            <button onClick={() => setShowGuestPanel(false)} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {missingGuests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-bold mb-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                {missingGuests.length} Guest(s) Unaccounted
              </div>
              {missingGuests.map((g) => (
                <div key={g.id} className="text-xs text-amber-600 ml-5">• {g.name} — Room {g.room}</div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {affectedGuests.map((g) => (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
                <div>
                  <p className="text-sm font-semibold text-on-surface">{g.name}</p>
                  <p className="text-xs text-on-surface-variant">Rm {g.room} • {g.language}</p>
                  {g.accessibility.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {g.accessibility.map((a) => (
                        <span key={a} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                  g.status === 'evacuated' ? 'bg-emerald-100 text-emerald-700' :
                  g.status === 'missing' ? 'bg-amber-100 text-amber-700' :
                  g.status === 'in-room' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {g.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </motion.aside>
      )}

      {/* Right Sidebar — Incident Detail */}
      <aside className="w-[400px] h-full bg-surface-container-lowest border-l border-outline-variant/20 flex flex-col overflow-y-auto shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Incident Header */}
        <div className={`p-6 border-b ${activeIncident.severity >= 3 ? 'bg-tertiary-container/10 border-tertiary-container/20' : 'bg-surface-container-low border-outline-variant/10'}`}>
          <div className="flex justify-between items-start mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${severityColor(activeIncident.severity)}`}>
              {severityLabel(activeIncident.severity)}
            </span>
            <span className="text-sm text-on-surface-variant font-mono">{formatElapsed(elapsedSeconds)} elapsed</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-2">{activeIncident.title}</h2>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">location_on</span>
            <span>{activeIncident.location.building}, Floor {activeIncident.location.floor}, Room {activeIncident.location.room}</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">{activeIncident.description}</p>

          {/* Quick stats */}
          <div className="flex gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-on-surface">{activeIncident.guestsAffected}</div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Affected</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{activeIncident.evacuated}</div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Evacuated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-600">{missingGuests.length}</div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Missing</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-tertiary">{activeIncident.casualties}</div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Casualties</div>
            </div>
          </div>
        </div>

        {/* Deployed Units */}
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">engineering</span>
            Deployed Units ({deployedStaff.length})
          </h3>
          <div className="flex flex-col gap-3">
            {deployedStaff.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                    {s.unit.replace('Unit ', 'U')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{s.unit} ({s.role})</p>
                    <p className="text-xs text-on-surface-variant">{s.eta || 'Deployed'}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-[20px]">radio</span>
              </div>
            ))}

            {deployedStaff.length === 0 && (
              <p className="text-sm text-on-surface-variant italic">No units deployed to this incident.</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="p-6 flex-1">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">history</span>
            Incident Log
          </h3>
          <div className="relative border-l-2 border-outline-variant/30 ml-3 flex flex-col gap-6">
            {activeIncident.timeline.map((event) => {
              const dotColor = event.type === 'alert' ? 'bg-tertiary-container' :
                event.type === 'escalation' ? 'bg-amber-500' :
                event.type === 'dispatch' ? 'bg-secondary' :
                event.type === 'resolution' ? 'bg-emerald-500' :
                'bg-primary';

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative pl-6"
                >
                  <div className={`absolute w-3 h-3 ${dotColor} rounded-full -left-[7px] top-1.5 shadow-[0_0_0_4px_#ffffff]`} />
                  <p className="text-xs font-mono text-on-surface-variant mb-1">{event.timestamp}</p>
                  <p className={`text-sm ${event.type === 'alert' ? 'font-bold text-tertiary' : event.type === 'escalation' ? 'font-semibold text-amber-700' : 'font-medium text-on-surface'}`}>
                    {event.message}
                  </p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{event.author}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Add Log */}
          <div className="mt-8 flex gap-2">
            <input
              className="flex-1 bg-surface-container-low border-none rounded-lg text-sm px-4 py-2 focus:ring-2 focus:ring-primary outline-none text-on-surface placeholder-on-surface-variant/50"
              placeholder="Add log entry..."
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
            />
            <button
              onClick={handleAddLog}
              className="bg-primary text-on-primary px-3 rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
