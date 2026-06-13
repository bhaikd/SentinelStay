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
    const { error: updErr } = await supabase.from('incidents').update({ status }).eq('id', id);
    if (updErr) throw new Error(updErr.message);
    const now = new Date();
    const tlType: TimelineEvent['type'] =
      status === 'resolved' ? 'resolution' :
      status === 'responding' ? 'dispatch' :
      'update';
    const message =
      status === 'resolved' ? 'Incident marked as resolved.' :
      status === 'responding' ? 'Units responding to scene.' :
      status === 'contained' ? 'Incident contained.' :
      'Status updated to active.';
    const { error: tlErr } = await supabase.from('timeline_events').insert({
      id: crypto.randomUUID(),
      incident_id: id,
      timestamp: now.toTimeString().slice(0, 8),
      message,
      type: tlType,
      author: 'Command Center',
    });
    if (tlErr) throw new Error(tlErr.message);
  },

  async escalateIncident(id: string, currentSeverity: number) {
    const nextSeverity = Math.min(4, currentSeverity + 1);
    const { error: updErr } = await supabase.from('incidents').update({ severity: nextSeverity }).eq('id', id);
    if (updErr) throw new Error(updErr.message);
    const now = new Date();
    const { error: tlErr } = await supabase.from('timeline_events').insert({
      id: crypto.randomUUID(),
      incident_id: id,
      timestamp: now.toTimeString().slice(0, 8),
      message: `Incident escalated to severity ${nextSeverity}.`,
      type: 'escalation',
      author: 'Command Center',
    });
    if (tlErr) throw new Error(tlErr.message);
  },

  async addTimelineEvent(incidentId: string, event: Omit<TimelineEvent, 'id'>) {
    const { error } = await supabase.from('timeline_events').insert({
      id: crypto.randomUUID(),
      incident_id: incidentId,
      timestamp: event.timestamp,
      message: event.message,
      type: event.type,
      author: event.author,
    });
    if (error) throw new Error(error.message);
  },

  async acknowledgeAlert(id: string) {
    const { error } = await supabase.from('alerts').update({ acknowledged: true }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateStaffStatus(id: string, status: StaffMember['status']) {
    const { error } = await supabase.from('staff').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async raiseStaffSOS(input: { staff: StaffMember; note?: string }) {
    const { staff, note } = input;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const message = `STAFF SOS: ${staff.name} (${staff.unit}) requesting backup${note ? ` — ${note}` : ''}`;
    const location = `${staff.location.building}, Floor ${staff.location.floor}`;
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        id: crypto.randomUUID(),
        type: 'staff',
        severity: 3,
        message,
        location,
        timestamp: timeStr,
        acknowledged: false,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Insert a new staff member (dispatcher/admin/staff per RLS).
   */
  async createStaff(input: {
    name: string;
    role: StaffMember['role'];
    unit?: string;
    building?: string;
    floor?: number;
    phone?: string;
  }) {
    const id = `U-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const unit = input.unit?.trim() || `Unit ${id.slice(2, 5)}`;
    const row = {
      id,
      name: input.name,
      role: input.role,
      unit,
      status: 'available' as StaffMember['status'],
      location_building: input.building || 'Tower A',
      location_floor: input.floor ?? 1,
      location_x: 100,
      location_y: 100,
      phone: input.phone || null,
      avatar: null,
      current_incident: null,
      eta: null,
    };
    const { data, error } = await supabase.from('staff').insert(row).select('*').single();
    if (error) throw new Error(error.message);
    return mapStaff(data);
  },

  /**
   * Deploy a staff member to an incident:
   *  - sets staff.current_incident + status to 'en-route' (or 'deployed')
   *  - appends the unit to incidents.assigned_units
   *  - inserts a 'dispatch' timeline event
   */
  async deployStaff(staffId: string, incidentId: string, opts?: { eta?: string; onScene?: boolean }) {
    const status: StaffMember['status'] = opts?.onScene ? 'deployed' : 'en-route';
    const eta = opts?.eta || (opts?.onScene ? 'On Scene' : 'ETA 2m');

    const { data: staffRow, error: sErr } = await supabase
      .from('staff')
      .update({ current_incident: incidentId, status, eta })
      .eq('id', staffId)
      .select('*')
      .single();
    if (sErr) throw new Error(sErr.message);

    const { data: incRow } = await supabase
      .from('incidents')
      .select('assigned_units')
      .eq('id', incidentId)
      .single();
    const existing: string[] = (incRow?.assigned_units || []) as string[];
    const unitName = staffRow.unit;
    if (unitName && !existing.includes(unitName)) {
      await supabase.from('incidents')
        .update({ assigned_units: [...existing, unitName] })
        .eq('id', incidentId);
    }

    const now = new Date();
    await supabase.from('timeline_events').insert({
      id: crypto.randomUUID(),
      incident_id: incidentId,
      timestamp: now.toTimeString().slice(0, 8),
      message: `${staffRow.unit} (${staffRow.name}) dispatched — ${eta}.`,
      type: 'dispatch',
      author: 'Command Center',
    });

    return mapStaff(staffRow);
  },

  /**
   * Recall a staff member from any incident: status -> available, clear linkage.
   */
  async recallStaff(staffId: string) {
    const { data: prev } = await supabase
      .from('staff')
      .select('current_incident, unit, name')
      .eq('id', staffId)
      .single();

    const { data, error } = await supabase
      .from('staff')
      .update({ current_incident: null, status: 'available', eta: null })
      .eq('id', staffId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    if (prev?.current_incident) {
      const { data: incRow } = await supabase
        .from('incidents')
        .select('assigned_units')
        .eq('id', prev.current_incident)
        .single();
      const existing: string[] = (incRow?.assigned_units || []) as string[];
      const next = existing.filter((u) => u !== prev.unit);
      if (next.length !== existing.length) {
        await supabase.from('incidents')
          .update({ assigned_units: next })
          .eq('id', prev.current_incident);
      }
      const now = new Date();
      await supabase.from('timeline_events').insert({
        id: crypto.randomUUID(),
        incident_id: prev.current_incident,
        timestamp: now.toTimeString().slice(0, 8),
        message: `${prev.unit} (${prev.name}) recalled to standby.`,
        type: 'update',
        author: 'Command Center',
      });
    }

    return mapStaff(data);
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

  /**
   * Creates a guest-initiated SOS by inserting only the alerts row.
   * A `BEFORE INSERT` trigger (`handle_new_sos_alert` in schema.sql) creates
   * the linked incident + timeline event server-side, bypassing RLS so guests
   * who can only INSERT alerts still produce a full incident record visible
   * in the Staff Dashboard and Incident Log.
   */
  async createSOSAlert(input: {
    category: 'medical' | 'fire' | 'security' | 'other';
    room: string;
    floor: number;
    building: string;
    silent?: boolean;
    guestName?: string;
  }) {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const severityMap = { medical: 3, fire: 4, security: 3, other: 2 } as const;
    const alertId = crypto.randomUUID();

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        id: alertId,
        type: 'sos',
        severity: severityMap[input.category],
        message: `SOS: ${input.category} emergency in Room ${input.room}${input.silent ? ' (silent mode)' : ''}`,
        location: `${input.building}, Floor ${input.floor}, Room ${input.room}`,
        timestamp: timeStr,
        acknowledged: false,
      })
      .select('id, incident_id')
      .single();

    if (error) {
      console.error('SOS alert insert failed:', error.message);
      throw new Error(error.message);
    }

    return { alertId: data.id, incidentId: data.incident_id ?? null };
  },

  // ---------------------------------------------------------------------------
  // Chat / Channels — guest <-> staff realtime messaging.
  // A `channel` is just a string key, e.g. "Tower A::1402". Anyone can read,
  // anon may only insert as sender='guest', staff may post anything.
  // ---------------------------------------------------------------------------

  channelKey(building: string, room: string) {
    return `${building.trim()}::${room.trim()}`;
  },

  async fetchMessages(channel: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('channel', channel)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data || []) as ChatMessageRow[];
  },

  async fetchChannels() {
    // Returns a unique channel list with last message + count for the staff panel.
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    const map = new Map<string, { channel: string; lastMessage: ChatMessageRow; count: number }>();
    for (const row of (data || []) as ChatMessageRow[]) {
      const existing = map.get(row.channel);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(row.channel, { channel: row.channel, lastMessage: row, count: 1 });
      }
    }
    return Array.from(map.values());
  },

  async sendMessage(input: {
    channel: string;
    sender: 'guest' | 'staff' | 'ai' | 'system';
    senderName?: string;
    body?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'audio' | 'location';
    lat?: number;
    lng?: number;
  }) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        channel: input.channel,
        sender: input.sender,
        sender_name: input.senderName ?? null,
        body: input.body ?? null,
        attachment_url: input.attachmentUrl ?? null,
        attachment_type: input.attachmentType ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as ChatMessageRow;
  },

  subscribeMessages(channel: string, onInsert: (row: ChatMessageRow) => void) {
    const sub = supabase
      .channel(`messages:${channel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${channel}` },
        (payload) => onInsert(payload.new as ChatMessageRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  },

  subscribeAllMessages(onInsert: (row: ChatMessageRow) => void) {
    const sub = supabase
      .channel('messages:all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => onInsert(payload.new as ChatMessageRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  },

  async uploadAttachment(file: Blob, opts: { channel: string; kind: 'image' | 'audio'; ext: string }) {
    const safeChannel = opts.channel.replace(/[^a-z0-9._-]/gi, '_');
    const path = `${safeChannel}/${opts.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${opts.ext}`;
    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(path);
    return data.publicUrl;
  },
};

export interface ChatMessageRow {
  id: string;
  channel: string;
  sender: 'guest' | 'staff' | 'ai' | 'system';
  sender_name: string | null;
  body: string | null;
  attachment_url: string | null;
  attachment_type: 'image' | 'audio' | 'location' | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}
