import { supabase } from '../lib/supabase';
import type { Incident, StaffMember, Guest, AlertNotification, TimelineEvent } from '../types';

export const mapTimelineEvent = (te: any): TimelineEvent => ({
  id: te.id,
  timestamp: te.timestamp,
  message: te.message,
  type: te.type,
  author: te.author,
});

export const mapIncident = (row: any, timelineEvents: any[] = []): Incident => ({
  id: row.id,
  title: row.title,
  type: row.type,
  severity: row.severity,
  status: row.status,
  location: {
    building: row.location_building,
    floor: row.location_floor,
    room: row.location_room,
    coordinates: { x: row.location_x, y: row.location_y },
  },
  reportedAt: row.reported_at,
  reportedBy: row.reported_by,
  description: row.description,
  assignedUnits: row.assigned_units || [],
  casualties: row.casualties,
  evacuated: row.evacuated,
  guestsAffected: row.guests_affected,
  timeline: timelineEvents.map(mapTimelineEvent).reverse(),
});

export const mapStaff = (row: any): StaffMember => ({
  id: row.id,
  name: row.name,
  role: row.role,
  unit: row.unit,
  status: row.status,
  location: {
    building: row.location_building,
    floor: row.location_floor,
    x: row.location_x,
    y: row.location_y,
  },
  phone: row.phone,
  avatar: row.avatar,
  currentIncident: row.current_incident,
  eta: row.eta,
});

export const mapGuest = (row: any): Guest => ({
  id: row.id,
  name: row.name,
  room: row.room,
  building: row.building,
  floor: row.floor,
  checkIn: row.check_in,
  checkOut: row.check_out,
  status: row.status,
  accessibility: row.accessibility || [],
  language: row.language,
  vip: row.vip,
  lastSeen: row.last_seen,
  phone: row.phone,
});

export const mapAlert = (row: any): AlertNotification => ({
  id: row.id,
  type: row.type,
  severity: row.severity,
  message: row.message,
  location: row.location,
  timestamp: row.timestamp,
  acknowledged: row.acknowledged,
  incidentId: row.incident_id,
});

export const api = {
  async fetchAll() {
    const [
      { data: incidentsData },
      { data: staffData },
      { data: guestsData },
      { data: alertsData },
    ] = await Promise.all([
      supabase.from('incidents').select('*, timeline_events(*)').order('reported_at', { ascending: false }),
      supabase.from('staff').select('*'),
      supabase.from('guests').select('*'),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }),
    ]);

    const incidents: Incident[] = (incidentsData || []).map((row: any) => mapIncident(row, row.timeline_events || []));

    const staff: StaffMember[] = (staffData || []).map(mapStaff);
    const guests: Guest[] = (guestsData || []).map(mapGuest);
    const alerts: AlertNotification[] = (alertsData || []).map(mapAlert);

    return { incidents, staff, guests, alerts };
  },

  async updateIncidentStatus(id: string, status: Incident['status']) {
    await supabase.from('incidents').update({ status }).eq('id', id);
  },

  async escalateIncident(id: string, currentSeverity: number) {
    const nextSeverity = Math.min(4, currentSeverity + 1);
    await supabase.from('incidents').update({ severity: nextSeverity }).eq('id', id);
  },

  async addTimelineEvent(incidentId: string, event: Omit<TimelineEvent, 'id'>) {
    await supabase.from('timeline_events').insert({
      id: crypto.randomUUID(),
      incident_id: incidentId,
      timestamp: event.timestamp,
      message: event.message,
      type: event.type,
      author: event.author,
    });
  },

  async acknowledgeAlert(id: string) {
    await supabase.from('alerts').update({ acknowledged: true }).eq('id', id);
  },

  async createDrillIncident() {
    const drillId = `DRILL-${Math.floor(Math.random() * 10000)}`;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);

    const drillIncident = {
      id: drillId,
      title: 'Simulation Drill — Fire Alarm',
      type: 'fire',
      severity: 3,
      status: 'active',
      location_building: 'Tower A',
      location_floor: 14,
      location_room: '1405',
      location_x: 520,
      location_y: 60,
      reported_at: now.toISOString(),
      reported_by: 'Drill System',
      description: 'This is a simulated drill incident for training purposes. Please respond as if it were a real incident.',
      assigned_units: [],
      casualties: 0,
      evacuated: 0,
      guests_affected: 0,
    };

    await supabase.from('incidents').insert(drillIncident);

    await supabase.from('timeline_events').insert({
      id: crypto.randomUUID(),
      incident_id: drillId,
      timestamp: timeStr,
      message: 'Drill initiated. Please respond to the designated location.',
      type: 'alert',
      author: 'System'
    });

    await supabase.from('alerts').insert({
      id: crypto.randomUUID(),
      type: 'system',
      severity: 3,
      message: `DRILL: Fire alarm simulation initiated on Floor 14.`,
      location: 'Tower A, Floor 14',
      timestamp: timeStr,
      incident_id: drillId,
      acknowledged: false
    });
  },
};
