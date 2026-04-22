import { supabase } from '../lib/supabase';
import type { Incident, StaffMember, Guest, AlertNotification, TimelineEvent } from '../types';

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

    const incidents: Incident[] = (incidentsData || []).map((row: any) => ({
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
      timeline: (row.timeline_events || []).map((te: any) => ({
        id: te.id,
        timestamp: te.timestamp,
        message: te.message,
        type: te.type,
        author: te.author,
      })).reverse(),
    }));

    const staff: StaffMember[] = (staffData || []).map((row: any) => ({
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
    }));

    const guests: Guest[] = (guestsData || []).map((row: any) => ({
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
    }));

    const alerts: AlertNotification[] = (alertsData || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      message: row.message,
      location: row.location,
      timestamp: row.timestamp,
      acknowledged: row.acknowledged,
      incidentId: row.incident_id,
    }));

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
      id: `tl-${Date.now()}`,
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
};
