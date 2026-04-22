export interface Incident {
  id: string;
  title: string;
  type: 'fire' | 'medical' | 'security' | 'hazmat' | 'weather' | 'other';
  severity: 1 | 2 | 3 | 4;
  status: 'active' | 'responding' | 'contained' | 'resolved';
  location: {
    building: string;
    floor: number;
    room: string;
    coordinates: { x: number; y: number };
  };
  reportedAt: string;
  reportedBy: string;
  description: string;
  assignedUnits: string[];
  timeline: TimelineEvent[];
  casualties: number;
  evacuated: number;
  guestsAffected: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  message: string;
  type: 'alert' | 'dispatch' | 'update' | 'escalation' | 'resolution';
  author: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'security' | 'maintenance' | 'medical' | 'management' | 'housekeeping' | 'engineering';
  unit: string;
  status: 'available' | 'deployed' | 'en-route' | 'off-duty' | 'break';
  location: { building: string; floor: number; x: number; y: number };
  phone: string;
  avatar?: string;
  currentIncident?: string;
  eta?: string;
}

export interface Guest {
  id: string;
  name: string;
  room: string;
  building: string;
  floor: number;
  checkIn: string;
  checkOut: string;
  status: 'in-room' | 'common-area' | 'evacuated' | 'missing' | 'checked-out';
  accessibility: string[];
  language: string;
  vip: boolean;
  lastSeen: string;
  phone?: string;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  status: 'nominal' | 'alert' | 'critical';
  rooms: number;
  occupancy: number;
  activeIncidents: number;
  staffOnDuty: number;
}

export interface AlertNotification {
  id: string;
  type: 'sos' | 'sensor' | 'staff' | 'system';
  severity: 1 | 2 | 3 | 4;
  message: string;
  location: string;
  timestamp: string;
  acknowledged: boolean;
  incidentId?: string;
}

export type NavItem = {
  label: string;
  icon: string;
  path: string;
  badge?: number;
};

// Runtime export so esbuild never treats this as an empty module
export const SENTINEL_TYPES_VERSION = '1.0.0';
