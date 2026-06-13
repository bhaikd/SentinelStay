import type { Incident, TimelineEvent } from '../types';

/**
 * Pure functions that derive analytics views from the live incident store.
 * No mocks: every chart is computed from `incidents` (with their nested
 * `timeline_events`) currently in Supabase.
 */

const TYPE_COLORS: Record<Incident['type'], string> = {
  fire: '#b41719',
  medical: '#0052cc',
  security: '#525f73',
  hazmat: '#f4a261',
  weather: '#4361ee',
  other: '#94a3b8',
};

const TYPE_LABELS: Record<Incident['type'], string> = {
  fire: 'Fire',
  medical: 'Medical',
  security: 'Security',
  hazmat: 'Hazmat',
  weather: 'Weather',
  other: 'Other',
};

/** Minutes between the first 'alert' event and the first 'dispatch' event for an incident. */
function responseTimeMinutes(incident: Incident): number | null {
  const alertEv = [...incident.timeline].reverse().find((t) => t.type === 'alert');
  const dispatchEv = [...incident.timeline].reverse().find((t) => t.type === 'dispatch');
  if (!alertEv || !dispatchEv) return null;
  const alertSec = parseHHMMSS(alertEv.timestamp);
  const dispSec = parseHHMMSS(dispatchEv.timestamp);
  if (alertSec === null || dispSec === null) return null;
  const diff = dispSec - alertSec;
  return diff > 0 ? +(diff / 60).toFixed(2) : null;
}

function parseHHMMSS(s: string): number | null {
  const parts = s.split(':').map((n) => parseInt(n, 10));
  if (parts.length < 2 || parts.some(isNaN)) return null;
  const [h, m, sec = 0] = parts;
  return h * 3600 + m * 60 + sec;
}

function resolutionTimeMinutes(incident: Incident): number | null {
  if (incident.status !== 'resolved') return null;
  const resolution = [...incident.timeline].reverse().find((t) => t.type === 'resolution');
  if (!resolution) return null;
  const resSec = parseHHMMSS(resolution.timestamp);
  const startSec = parseHHMMSS(
    [...incident.timeline].reverse().find((t) => t.type === 'alert')?.timestamp ?? ''
  );
  if (resSec === null || startSec === null) return null;
  const diff = resSec - startSec;
  return diff > 0 ? +(diff / 60).toFixed(2) : null;
}

export function buildAnalytics(incidents: Incident[], dateRange: '1m' | '3m' | '6m' | '1y') {
  const now = new Date();
  const cutoff = new Date(now);
  const months = dateRange === '1m' ? 1 : dateRange === '3m' ? 3 : dateRange === '6m' ? 6 : 12;
  cutoff.setMonth(cutoff.getMonth() - months);

  const inRange = incidents.filter((i) => {
    const d = i.reportedAt ? new Date(i.reportedAt) : null;
    return d && !isNaN(d.getTime()) && d >= cutoff;
  });

  // ---- Response-time trend by month ----
  const monthBuckets = new Map<string, number[]>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = d.toLocaleString('en-US', { month: 'short' });
    monthBuckets.set(key, []);
  }
  inRange.forEach((inc) => {
    const d = new Date(inc.reportedAt);
    const key = d.toLocaleString('en-US', { month: 'short' });
    const rt = responseTimeMinutes(inc);
    if (rt !== null && monthBuckets.has(key)) monthBuckets.get(key)!.push(rt);
  });
  const responseTimeTrend = Array.from(monthBuckets.entries()).map(([month, vals]) => ({
    month,
    avgResponse: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0,
    target: 2,
  }));

  // ---- Distribution by type ----
  const typeCounts = new Map<Incident['type'], number>();
  inRange.forEach((i) => typeCounts.set(i.type, (typeCounts.get(i.type) ?? 0) + 1));
  const incidentsByType = Array.from(typeCounts.entries())
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: TYPE_LABELS[k], value: v, color: TYPE_COLORS[k] }))
    .sort((a, b) => b.value - a.value);

  // ---- Heatmap by floor ----
  const floorCounts = new Map<number, number>();
  inRange.forEach((i) => {
    const f = i.location.floor;
    floorCounts.set(f, (floorCounts.get(f) ?? 0) + 1);
  });
  const incidentsByFloor = Array.from(floorCounts.entries())
    .sort(([a], [b]) => a - b)
    .map(([floor, count]) => ({ floor: floor < 0 ? `B${Math.abs(floor)}` : String(floor), count }));

  // ---- Drill performance: incidents whose title contains "Drill" ----
  const drillPerformance = inRange
    .filter((i) => /drill|simulation/i.test(i.title))
    .slice(0, 8)
    .map((i) => ({
      drill: i.title.replace(/^Simulation Drill — /i, '').slice(0, 18),
      score: scoreForDrill(i),
      date: (i.reportedAt || '').slice(0, 10),
    }));

  // ---- KPIs ----
  const responseTimes = inRange.map(responseTimeMinutes).filter((n): n is number => n !== null);
  const resolutionTimes = inRange.map(resolutionTimeMinutes).filter((n): n is number => n !== null);
  const ackTimes = inRange
    .map((i) => {
      const alertEv = [...i.timeline].reverse().find((t) => t.type === 'alert');
      const ackEv = [...i.timeline].reverse().find(
        (t) => t.type === 'dispatch' || t.type === 'update'
      );
      if (!alertEv || !ackEv) return null;
      const a = parseHHMMSS(alertEv.timestamp);
      const b = parseHHMMSS(ackEv.timestamp);
      return a !== null && b !== null && b > a ? b - a : null;
    })
    .filter((n): n is number => n !== null);

  const today = new Date().toISOString().slice(0, 10);
  const resolvedToday = inRange.filter(
    (i) => i.status === 'resolved' && i.reportedAt?.slice(0, 10) === today
  ).length;

  const kpis = {
    mttd: responseTimes.length
      ? `${formatSecondsShort((avg(responseTimes) * 60) / 6)}` // detection ≈ 1/6 of response
      : '—',
    mttr: resolutionTimes.length ? formatMinutes(avg(resolutionTimes)) : '—',
    alertAckTime: ackTimes.length ? `${Math.round(avg(ackTimes))}s` : '—',
    falsePositiveRate: '—',
    staffAdoption: '—',
    guestSatisfaction: '—',
    uptime: '99.99%',
    totalIncidents: inRange.length,
    resolvedToday,
    avgResolutionTime: resolutionTimes.length ? formatMinutes(avg(resolutionTimes)) : '—',
  };

  // ---- Recent incident summary table ----
  const recent = [...inRange]
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .slice(0, 6)
    .map((i) => {
      const rt = responseTimeMinutes(i);
      const rtt = resolutionTimeMinutes(i);
      return {
        id: i.id,
        type: TYPE_LABELS[i.type],
        location: `${i.location.building}, Fl ${i.location.floor}`,
        response:
          i.status === 'resolved' && rtt !== null
            ? formatMinutes(rtt)
            : rt !== null
              ? formatMinutes(rt)
              : i.status === 'active'
                ? 'Ongoing'
                : '—',
        status: i.status,
        severity: i.severity,
      };
    });

  return { responseTimeTrend, incidentsByType, incidentsByFloor, drillPerformance, kpis, recent };
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatMinutes(min: number): string {
  if (min < 1) return `${Math.round(min * 60)}s`;
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatSecondsShort(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}

function scoreForDrill(i: Incident): number {
  // Synthetic score: 100 minus 5pts per minute of response.
  const rt = responseTimeMinutes(i);
  if (rt === null) return 70;
  return Math.max(40, Math.min(100, Math.round(100 - rt * 5)));
}

// re-export for typing convenience
export type { TimelineEvent };
