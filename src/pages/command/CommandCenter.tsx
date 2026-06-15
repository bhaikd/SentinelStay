import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { formatElapsed, severityColor, severityLabel, typeIcon } from '../../utils/formatting';
import { computeSafePath } from '../../utils/pathfinding';



// SVG floor plan rooms for Floor 14
const floorRooms = [
  { id: '1401', x: 40, y: 60, w: 100, h: 70, label: '1401' },
  { id: '1402', x: 160, y: 60, w: 100, h: 70, label: '1402' },
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
  { x: 35, y: 150, w: 705, h: 110 },
];

const facilities = [
  { x: 760, y: 60, w: 60, h: 70, label: 'Elev A', icon: 'elevator' },
  { x: 760, y: 150, w: 60, h: 50, label: 'Stairs', icon: 'stairs' },
  { x: 760, y: 220, w: 60, h: 50, label: 'Stairs', icon: 'stairs' },
  { x: 760, y: 280, w: 60, h: 70, label: 'Elev B', icon: 'elevator' },
  { x: 5, y: 170, w: 30, h: 70, label: 'Stairs C', icon: 'stairs' },
];

export default function CommandCenter() {
  const { incidents, staff, guests, currentFloor, setCurrentFloor, elapsedSeconds, addTimelineEvent, addStaff, deployStaff, recallStaff, respondToIncident, escalateIncident, resolveIncident, alerts, initiateRollCall, terminateRollCall } = useAppStore();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(incidents[0]?.id ?? null);
  const [logInput, setLogInput] = useState('');
  const [showGuestPanel, setShowGuestPanel] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showDeployPicker, setShowDeployPicker] = useState(false);

  // AI Summarization State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  // Keep the selection valid as the incidents list mutates (resolve/realtime).
  React.useEffect(() => {
    if (incidents.length === 0) {
      if (selectedIncidentId !== null) setSelectedIncidentId(null);
      return;
    }
    if (!selectedIncidentId || !incidents.find((i) => i.id === selectedIncidentId)) {
      setSelectedIncidentId(incidents[0].id);
    }
  }, [incidents, selectedIncidentId]);

  const activeIncident = selectedIncidentId ? incidents.find((i) => i.id === selectedIncidentId) ?? incidents[0] : incidents[0];
  const deployedStaff = activeIncident ? staff.filter((s) => s.currentIncident === activeIncident.id) : [];
  const availableStaff = staff.filter((s) => s.status === 'available' && !s.currentIncident);
  const affectedGuests = guests.filter((g) => g.floor === currentFloor);
  const missingGuests = affectedGuests.filter((g) => g.status === 'missing');

  // Live floor-plan data: incidents currently on the visible floor + their staff.
  const floorIncidents = incidents.filter(
    (i) => i.location.floor === currentFloor && i.status !== 'resolved'
  );
  const alertedRoomIds = new Set(floorIncidents.map((i) => i.location.room));
  const floorStaff = staff.filter((s) => s.location.floor === currentFloor);

  // Map active incidents on this floor for pathfinding
  const activeIncidentsInfo = React.useMemo(() => {
    return floorIncidents.map((inc) => ({
      room: inc.location.room,
      type: inc.type,
      severity: inc.severity,
    }));
  }, [floorIncidents]);

  // Check if elevators should be disabled
  const hasFireHazmatWeather = React.useMemo(() => {
    return activeIncidentsInfo.some(
      (inc) =>
        inc.type === 'fire' ||
        inc.type === 'hazmat' ||
        inc.type === 'weather'
    );
  }, [activeIncidentsInfo]);

  // Compute safe paths from all rooms to exits
  const roomPaths = React.useMemo(() => {
    const paths: Record<string, { path: { x: number; y: number }[]; exitId: string } | null> = {};
    const rooms = ['1401', '1402', '1403', '1404', '1405', '1406', '1407', '1408', '1409', '1410', '1411', '1412'];
    rooms.forEach((r) => {
      paths[r] = computeSafePath(r, activeIncidentsInfo);
    });
    return paths;
  }, [activeIncidentsInfo]);

  // Safety roll call check calculations
  const safeGuests = affectedGuests.filter((g) => g.status === 'evacuated');
  const needsHelpGuests = affectedGuests.filter((g) => g.status === 'missing');
  const unaccountedGuests = affectedGuests.filter(
    (g) => g.status !== 'evacuated' && g.status !== 'missing' && g.status !== 'checked-out'
  );
  const completionPercent = affectedGuests.length > 0
    ? Math.round(((safeGuests.length + needsHelpGuests.length) / affectedGuests.length) * 100)
    : 0;

  const isRollCallActive = alerts.some((a) => {
    if (a.type !== 'system' || a.acknowledged) return false;
    const match = a.message.match(/Floor (\d+)/);
    const alertFloor = match ? parseInt(match[1], 10) : null;
    return alertFloor === currentFloor;
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAddLog = () => {
    if (!logInput.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    addTimelineEvent(activeIncident.id, {
      id: crypto.randomUUID(),
      timestamp: timeStr,
      message: logInput.trim(),
      type: 'update',
      author: 'Commander Alpha',
    });
    setLogInput('');
    showToast('Log entry added to timeline.');
  };

  const handleSummarize = async () => {
    if (!activeIncident) return;
    setIsSummarizing(true);
    setSummaryText('');
    setSummaryError(null);

    try {
      const response = await fetch('/api/summarize-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeIncident.title,
          description: activeIncident.description,
          affectedSystems: `${activeIncident.guestsAffected} guests affected, ${missingGuests.length} missing.`,
          timestamps: activeIncident.timeline.map(e => `[${e.timestamp}] ${e.message}`).join('\n')
        })
      });

      if (!response.ok) {
        let errorMsg = 'Failed to start summarization';
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch {
          if (response.status === 504 || response.status === 502) {
            errorMsg = 'API Server is not running. Please restart npm run dev.';
          } else {
            errorMsg = `Server responded with status ${response.status}`;
          }
        }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) throw new Error('No stream available');

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.replace('data: ', '');
              if (data === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  setSummaryError(parsed.error);
                  break;
                }
                if (parsed.text) {
                  setSummaryText(prev => prev + parsed.text);
                }
              } catch (e) {
                console.error('Error parsing JSON from stream:', e);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setSummaryError(err.message || 'An error occurred during summarization.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const renderParsedSummary = (text: string) => {
    if (!text) return null;
    
    let currentSection = 'summary';
    let summaryLines: string[] = [];
    let actionLines: string[] = [];
    let priorityLines: string[] = [];
    
    const lines = text.split('\n');
    
    for (let line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('suggested next actions') || lowerLine.includes('next actions') || lowerLine.includes('actions:')) {
        currentSection = 'actions';
        continue;
      } else if (lowerLine.includes('priority score') || lowerLine.includes('priority:')) {
        currentSection = 'priority';
        continue;
      } else if ((lowerLine.includes('summary') || lowerLine.includes('summary:')) && currentSection === 'summary') {
        continue;
      }
      
      if (currentSection === 'summary') summaryLines.push(line);
      if (currentSection === 'actions') actionLines.push(line);
      if (currentSection === 'priority') priorityLines.push(line);
    }

    const rawPriority = priorityLines.join(' ').trim();
    const scoreMatch = rawPriority.match(/\b([1-9]|10)\b/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const justification = rawPriority.replace(/\b([1-9]|10)\b/, '').trim().replace(/^[-:\/10]+/, '').trim().replace(/\*/g, '');

    return (
      <div className="space-y-4 text-sm mt-2">
        {summaryLines.length > 0 && summaryLines.some(l => l.trim()) && (
          <div>
            <h4 className="font-bold text-on-surface mb-1 text-xs uppercase tracking-wider text-primary">Summary</h4>
            <p className="text-on-surface-variant leading-relaxed">{summaryLines.join(' ').replace(/\*/g, '').trim()}</p>
          </div>
        )}
        
        {actionLines.length > 0 && actionLines.some(l => l.trim()) && (
          <div>
            <h4 className="font-bold text-on-surface mb-1 text-xs uppercase tracking-wider text-primary">Suggested Next Actions</h4>
            <ul className="list-decimal pl-5 text-on-surface-variant space-y-1">
              {actionLines.filter(l => l.trim()).map((l, i) => (
                <li key={i}>{l.replace(/^[\d\.\-\*]+/, '').trim()}</li>
              ))}
            </ul>
          </div>
        )}
        
        {priorityLines.length > 0 && priorityLines.some(l => l.trim()) && (
          <div>
            <h4 className="font-bold text-on-surface mb-2 text-xs uppercase tracking-wider text-primary">Priority Assessment</h4>
            <div className="flex items-start gap-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
              {score !== null ? (
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm ${score >= 8 ? 'bg-red-500' : score >= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                  {score}
                </div>
              ) : (
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm bg-gray-500">
                  ?
                </div>
              )}
              <div className="flex-1 text-on-surface-variant flex items-center">
                {justification || rawPriority.replace(/\*/g, '')}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!activeIncident) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-container-lowest text-on-surface">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-emerald-500 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <h2 className="text-2xl font-bold">No Active Incidents</h2>
          <p className="text-on-surface-variant mt-2">The command center is currently monitoring for alerts.</p>
        </div>
      </div>
    );
  }

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
            {floorRooms.map((room) => {
              const isAlerted = alertedRoomIds.has(room.id);
              const roomIncident = floorIncidents.find((i) => i.location.room === room.id);

              // Color rooms dynamically based on guest safety check status during active roll calls
              const roomGuests = guests.filter((g) => g.room === room.id && g.floor === currentFloor);
              const hasTrapped = roomGuests.some((g) => g.status === 'missing');
              const allSafe = roomGuests.length > 0 && roomGuests.every((g) => g.status === 'evacuated');

              let fill = isAlerted ? '#fef2f2' : '#ffffff';
              let stroke = isAlerted ? '#b41719' : '#e2e8f0';
              let strokeWidth = isAlerted ? 2 : 1;

              if (isRollCallActive) {
                if (hasTrapped) {
                  fill = '#fee2e2'; // Pulsing red-ish overlay
                  stroke = '#ef4444'; // Red border
                  strokeWidth = 3;
                } else if (allSafe) {
                  fill = '#ecfdf5'; // Light green fill
                  stroke = '#10b981'; // Green border
                  strokeWidth = 2;
                }
              }

              return (
                <g
                  key={room.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredRoomId(room.id)}
                  onMouseLeave={() => setHoveredRoomId(null)}
                  onClick={() => {
                    if (roomIncident) {
                      setSelectedIncidentId(roomIncident.id);
                    }
                  }}
                >
                  <rect
                    x={room.x} y={room.y} width={room.w} height={room.h}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    rx="4"
                    className="room-hover"
                  />
                  <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 4} textAnchor="middle" fontSize="12" fill={hasTrapped && isRollCallActive ? '#ef4444' : allSafe && isRollCallActive ? '#10b981' : isAlerted ? '#b41719' : '#64748b'} fontWeight={isAlerted || hasTrapped || allSafe ? '700' : '500'} fontFamily="Inter">
                    {room.label}
                  </text>
                  {isAlerted && (
                    <circle cx={room.x + room.w - 10} cy={room.y + 10} r="4" fill="#ef4444">
                      <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Facilities */}
            {facilities.map((f, i) => (
              <g key={`fac-${i}`}>
                <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" rx="4" />
                <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 3} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="500" fontFamily="Inter">{f.label}</text>
              </g>
            ))}

            {/* Live incident markers — one pulse per active incident on this floor */}
            {floorIncidents.map((inc) => {
              const room = floorRooms.find((r) => r.id === inc.location.room);
              const cx = room ? room.x + room.w / 2 : (inc.location.coordinates?.x ?? 200);
              const cy = room ? room.y + room.h / 2 : (inc.location.coordinates?.y ?? 100);
              const color = inc.severity >= 4 ? '#b41719' : inc.severity >= 3 ? '#dc2626' : inc.severity >= 2 ? '#f59e0b' : '#0ea5e9';
              return (
                <g key={`inc-${inc.id}`}>
                  <circle cx={cx} cy={cy} r="22" fill={color} opacity="0.12">
                    <animate attributeName="r" values="22;30;22" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.12;0.04;0.12" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={cx} cy={cy} r="14" fill={color} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="700" fontFamily="Inter">
                    {inc.type === 'fire' ? '🔥' : inc.type === 'medical' ? '＋' : inc.type === 'security' ? '!' : '⚠'}
                  </text>
                </g>
              );
            })}

            {/* Live staff markers — color reflects status */}
            {floorStaff.map((s) => {
              const cx = s.location.x;
              const cy = s.location.y;
              const fill =
                s.status === 'deployed' ? '#0052cc' :
                s.status === 'en-route' ? '#525f73' :
                s.status === 'available' ? '#10b981' :
                '#94a3b8';
              const label = s.unit.replace('Unit ', '').slice(0, 3);
              return (
                <g key={`staff-${s.id}`}>
                  <circle cx={cx} cy={cy} r="10" fill={fill} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fill="white" fontWeight="700" fontFamily="Inter">{label}</text>
                  <rect x={cx + 15} y={cy - 10} width="120" height="22" rx="11" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <circle cx={cx + 24} cy={cy + 1} r="4" fill={fill} />
                  <text x={cx + 32} y={cy + 5} fontSize="9" fill="#1e293b" fontWeight="600" fontFamily="Inter">{s.unit} ({s.role})</text>
                </g>
              );
            })}

            {/* Dynamic Evacuation Routes */}
            {floorIncidents.length > 0 &&
              Object.entries(roomPaths).map(([roomId, pathData]) => {
                if (!pathData) return null;

                const room = floorRooms.find((r) => r.id === roomId);
                if (!room) return null;

                const startPoint = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
                const coords = [startPoint, ...pathData.path];

                const isHovered = hoveredRoomId === roomId;
                const isIncidentRoom = activeIncident && activeIncident.location.room === roomId;
                const isHighlighted = isHovered || isIncidentRoom;

                const d = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

                return (
                  <g key={`path-${roomId}`} style={{ pointerEvents: 'none' }}>
                    <path
                      d={d}
                      fill="none"
                      stroke="#00C853"
                      strokeWidth={isHighlighted ? 4 : 1.5}
                      strokeDasharray={isHighlighted ? '8 4' : '4 4'}
                      strokeOpacity={isHighlighted ? 0.95 : 0.25}
                      markerEnd={isHighlighted ? 'url(#arrowhead)' : undefined}
                      className={isHighlighted ? 'drop-shadow-[0_0_8px_rgba(0,200,83,0.5)]' : ''}
                    >
                      {isHighlighted && (
                        <animate
                          attributeName="stroke-dashoffset"
                          values="0;-24"
                          dur="1.2s"
                          repeatCount="indefinite"
                        />
                      )}
                    </path>
                  </g>
                );
              })}

            {floorIncidents.length > 0 && (
              <text x="550" y="210" fontSize="9" fill="#00C853" fontWeight="600" fontFamily="Inter">DYNAMIC EVACUATION ROUTES ENABLED</text>
            )}

            {/* Missing-guest indicators */}
            {affectedGuests.filter((g) => g.status === 'missing').map((g) => {
              const room = floorRooms.find((r) => r.id === g.room);
              if (!room) return null;
              const cx = room.x + 50;
              const cy = room.y + 35;
              return (
                <g key={`miss-${g.id}`}>
                  <circle cx={cx} cy={cy} r="8" fill="#f59e0b" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">!</text>
                  <text x={cx} y={room.y - 8} textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="600" fontFamily="Inter">MISSING Rm {g.room}</text>
                </g>
              );
            })}
          </svg>

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-2 bg-surface-container-lowest/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-outline-variant/10">
            <div className="flex gap-3 text-[10px] text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" /> Incident</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary-container" /> Staff</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Missing</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#00C853]" /> Evac Route</span>
            </div>
            {hasFireHazmatWeather && (
              <div className="flex items-center gap-1 text-[9px] text-amber-500 font-bold border-t border-outline-variant/10 pt-1.5 animate-pulse">
                <span className="material-symbols-outlined text-[12px]">warning</span>
                Elevators disabled for evacuation
              </div>
            )}
          </div>

          {/* Incident quick-select tabs */}
          <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[60%]">
            {incidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => { setSelectedIncidentId(inc.id); setCurrentFloor(inc.location.floor); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
                  selectedIncidentId === inc.id
                    ? 'bg-tertiary-container text-white shadow-tertiary-container/30'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant border border-outline-variant/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{typeIcon(inc.type)}</span>
                {inc.id}
                {(inc.status === 'active') && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                {(inc.status === 'resolved') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
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

          {/* Safety Roll Call Control Center Panel */}
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3.5 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isRollCallActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
                Roll Call Check-in
              </h4>
              <span className="text-[10px] text-on-surface-variant font-medium">Tower A, F{currentFloor}</span>
            </div>

            {isRollCallActive ? (
              <div className="space-y-3">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-xs text-red-500 flex flex-col gap-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    BROADCAST LIVE
                  </div>
                  <p className="text-[10.5px] text-on-surface-variant leading-relaxed">
                    Guests on Floor {currentFloor} are prompted to report their status.
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1">
                    <span>PROGRESS</span>
                    <span>{completionPercent}% ({safeGuests.length + needsHelpGuests.length}/{affectedGuests.length})</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${affectedGuests.length > 0 ? (safeGuests.length / affectedGuests.length) * 100 : 0}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${affectedGuests.length > 0 ? (needsHelpGuests.length / affectedGuests.length) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Stats breakdown grid */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5">
                    <div className="text-sm font-black text-emerald-600">{safeGuests.length}</div>
                    <div className="text-[9px] font-semibold text-emerald-700/80">SAFE</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-1.5">
                    <div className="text-sm font-black text-red-500">{needsHelpGuests.length}</div>
                    <div className="text-[9px] font-semibold text-red-600/80">TRAPPED</div>
                  </div>
                  <div className="bg-slate-500/10 border border-slate-500/20 rounded p-1.5">
                    <div className="text-sm font-black text-on-surface-variant">{unaccountedGuests.length}</div>
                    <div className="text-[9px] font-semibold text-on-surface-variant">NO RESP</div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await terminateRollCall('Tower A', currentFloor);
                    showToast('Safety roll call broadcast ended.');
                  }}
                  className="w-full py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  End Safety Check
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10.5px] text-on-surface-variant leading-relaxed">
                  Broadcast an emergency check-in prompt to lock screens and verify guest status.
                </p>
                <button
                  onClick={async () => {
                    await initiateRollCall('Tower A', currentFloor);
                    showToast('Safety roll call broadcast active.');
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">emergency_share</span>
                  Start Safety Broadcast
                </button>
              </div>
            )}
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

          {/* AI Summarize Section */}
          <div className="mt-6 border-t border-outline-variant/10 pt-4">
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="w-full flex items-center justify-center gap-2 bg-primary-container text-on-primary-container py-2.5 rounded-lg font-semibold hover:bg-primary-container/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              {isSummarizing ? 'Generating AI Summary...' : 'Summarize Incident'}
              {isSummarizing && <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>}
            </button>
            
            {summaryError && (
              <div className="mt-3 text-xs text-red-400 bg-red-400/10 p-3 rounded-lg flex items-start gap-2 border border-red-400/20">
                <span className="material-symbols-outlined text-sm shrink-0">error</span>
                {summaryError}
              </div>
            )}
            
            {(summaryText || isSummarizing) && (
              <div className="mt-4 bg-surface-container-lowest p-4 rounded-xl border border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-tertiary to-primary opacity-50" />
                {renderParsedSummary(summaryText)}
              </div>
            )}
          </div>
        </div>

        {/* Deployed Units */}
        <div className="p-6 border-b border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">engineering</span>
              Deployed Units ({deployedStaff.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeployPicker(true)}
                disabled={!activeIncident || availableStaff.length === 0}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={availableStaff.length === 0 ? 'No available units' : 'Deploy a unit'}
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Deploy
              </button>
              <button
                onClick={() => setShowAddStaff(true)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors"
                title="Add a new staff member to the roster"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Add Staff
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {deployedStaff.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                    {s.unit.replace('Unit ', 'U')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{s.unit} ({s.role})</p>
                    <p className="text-xs text-on-surface-variant">{s.eta || 'Deployed'} — {s.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => { recallStaff(s.id); showToast(`${s.unit} recalled to standby.`); }}
                  className="text-xs font-semibold text-on-surface-variant hover:text-tertiary px-2 py-1 rounded hover:bg-surface-container transition-colors"
                  title="Recall this unit"
                >
                  Recall
                </button>
              </div>
            ))}

            {deployedStaff.length === 0 && (
              <p className="text-sm text-on-surface-variant italic">No units deployed to this incident.</p>
            )}
          </div>

          {/* Incident control row */}
          {activeIncident && activeIncident.status !== 'resolved' && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={() => { respondToIncident(activeIncident.id); showToast('Status set to responding.'); }}
                disabled={activeIncident.status === 'responding'}
                className="text-[11px] font-semibold px-2 py-1.5 rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 disabled:opacity-40 transition-colors"
              >Respond</button>
              <button
                onClick={() => { escalateIncident(activeIncident.id); showToast('Severity escalated.'); }}
                disabled={activeIncident.severity >= 4}
                className="text-[11px] font-semibold px-2 py-1.5 rounded-md bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
              >Escalate</button>
              <button
                onClick={() => { resolveIncident(activeIncident.id); showToast('Incident resolved.'); }}
                className="text-[11px] font-semibold px-2 py-1.5 rounded-md bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors"
              >Resolve</button>
            </div>
          )}
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

      {/* Deploy Unit Picker */}
      <AnimatePresence>
        {showDeployPicker && activeIncident && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeployPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest text-on-surface rounded-2xl shadow-2xl w-full max-w-md p-6 border border-outline-variant/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Deploy Unit to {activeIncident.id}</h3>
                <button onClick={() => setShowDeployPicker(false)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-xs text-on-surface-variant mb-4">{activeIncident.title} • {activeIncident.location.building}, Floor {activeIncident.location.floor}</p>
              {availableStaff.length === 0 ? (
                <p className="text-sm text-on-surface-variant italic">All units are currently engaged.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {availableStaff.map((s) => (
                    <button
                      key={s.id}
                      onClick={async () => {
                        await deployStaff(s.id, activeIncident.id, { eta: 'ETA 2m' });
                        showToast(`${s.unit} dispatched to ${activeIncident.id}.`);
                        setShowDeployPicker(false);
                      }}
                      className="w-full flex items-center justify-between p-3 bg-surface-container-low hover:bg-surface-container-high rounded-lg transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold">{s.unit} — {s.name}</p>
                        <p className="text-xs text-on-surface-variant">{s.role} • Floor {s.location.floor}</p>
                      </div>
                      <span className="material-symbols-outlined text-primary">send</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Staff modal */}
      <AnimatePresence>
        {showAddStaff && (
          <AddStaffModal
            onClose={() => setShowAddStaff(false)}
            onSubmit={async (input) => {
              const created = await addStaff(input);
              if (created) {
                showToast(`${created.unit} added to roster.`);
                setShowAddStaff(false);
              } else {
                showToast('Failed to add staff. Check console.');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// -------- Add Staff modal --------
function AddStaffModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: { name: string; role: 'security' | 'maintenance' | 'medical' | 'management' | 'housekeeping' | 'engineering'; unit?: string; building?: string; floor?: number; phone?: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'security' | 'maintenance' | 'medical' | 'management' | 'housekeeping' | 'engineering'>('security');
  const [unit, setUnit] = useState('');
  const [building, setBuilding] = useState('Tower A');
  const [floor, setFloor] = useState(1);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSubmitting(true);
          await onSubmit({ name: name.trim(), role, unit: unit.trim() || undefined, building, floor, phone: phone.trim() || undefined });
          setSubmitting(false);
        }}
        className="bg-surface-container-lowest text-on-surface rounded-2xl shadow-2xl w-full max-w-md p-6 border border-outline-variant/20 space-y-3"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Add Staff Member</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Full name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus
            className="mt-1 w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant/20 text-sm focus:ring-2 focus:ring-primary outline-none" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Role
            <select value={role} onChange={(e) => setRole(e.target.value as any)}
              className="mt-1 w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant/20 text-sm">
              <option value="security">Security</option>
              <option value="maintenance">Maintenance</option>
              <option value="medical">Medical</option>
              <option value="management">Management</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="engineering">Engineering</option>
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Unit (optional)
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit 14"
              className="mt-1 w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant/20 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Building
            <input value={building} onChange={(e) => setBuilding(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant/20 text-sm" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Floor
            <input type="number" min={1} max={50} value={floor} onChange={(e) => setFloor(parseInt(e.target.value || '1'))}
              className="mt-1 w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant/20 text-sm" />
          </label>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Phone (optional)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100"
            className="mt-1 w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant/20 text-sm" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-semibold bg-surface-container-high hover:bg-surface-variant">Cancel</button>
          <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 rounded-md text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50">
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
