export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `00:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function severityLabel(severity: number): string {
  switch (severity) {
    case 4: return 'Critical Priority';
    case 3: return 'High Priority';
    case 2: return 'Medium Priority';
    case 1: return 'Low Priority';
    default: return 'Unknown';
  }
}

export function severityColor(severity: number): string {
  switch (severity) {
    case 4: return 'bg-tertiary-container text-white';
    case 3: return 'bg-orange-500 text-white';
    case 2: return 'bg-amber-500 text-white';
    case 1: return 'bg-blue-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
}

export function typeIcon(type: string): string {
  switch (type) {
    case 'fire': return 'local_fire_department';
    case 'medical': return 'medical_services';
    case 'security': return 'shield';
    case 'hazmat': return 'warning';
    case 'weather': return 'thunderstorm';
    default: return 'error';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'available': return 'bg-emerald-500';
    case 'deployed': return 'bg-primary-container';
    case 'en-route': return 'bg-amber-500';
    case 'off-duty': return 'bg-gray-400';
    case 'break': return 'bg-purple-400';
    default: return 'bg-gray-400';
  }
}

export function roleColor(role: string): string {
  switch (role) {
    case 'security': return 'bg-blue-600 text-white';
    case 'medical': return 'bg-red-500 text-white';
    case 'maintenance': return 'bg-amber-600 text-white';
    case 'engineering': return 'bg-teal-600 text-white';
    case 'housekeeping': return 'bg-purple-500 text-white';
    case 'management': return 'bg-indigo-600 text-white';
    default: return 'bg-gray-500 text-white';
  }
}
