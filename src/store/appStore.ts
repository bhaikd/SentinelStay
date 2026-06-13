import { create } from 'zustand';
import { differenceInSeconds } from 'date-fns';
import type { Incident, StaffMember, Guest, AlertNotification } from '../types';
import { api, mapIncident, mapStaff, mapGuest, mapAlert, mapTimelineEvent } from '../services/api';
import { supabase } from '../lib/supabase';

interface AppState {
  isLoading: boolean;
  hydrate: () => Promise<void>;

  // Incidents
  incidents: Incident[];
  activeIncidentId: string | null;
  setActiveIncident: (id: string | null) => void;
  addTimelineEvent: (incidentId: string, event: Incident['timeline'][0]) => void;
  respondToIncident: (incidentId: string) => void;
  escalateIncident: (incidentId: string) => void;
  resolveIncident: (incidentId: string) => void;

  // Staff
  staff: StaffMember[];
  updateStaffStatus: (staffId: string, status: StaffMember['status']) => void;
  addStaff: (input: { name: string; role: StaffMember['role']; unit?: string; building?: string; floor?: number; phone?: string }) => Promise<StaffMember | null>;
  deployStaff: (staffId: string, incidentId: string, opts?: { eta?: string; onScene?: boolean }) => Promise<void>;
  recallStaff: (staffId: string) => Promise<void>;

  // Guests
  guests: Guest[];
  updateGuestStatus: (guestId: string, status: Guest['status']) => void;

  // Alerts
  alerts: AlertNotification[];
  acknowledgeAlert: (id: string) => void;
  unacknowledgedCount: () => number;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentFloor: number;
  setCurrentFloor: (floor: number) => void;
  conditionLevel: 'green' | 'yellow' | 'red';
  elapsedSeconds: number;
  startDrill: () => void;
}

// Since simulation logic is handled in the backend, we just track elapsedSeconds locally 
// or base it off the active incident reportedAt. To maintain current behavior, 
// we will just keep a local counter for UI if needed, but it really should be 
// based on `new Date() - activeIncident.reportedAt`. For simplicity we'll keep a mock tick 
// or compute it dynamically if desired. We'll set a static 262 to avoid breaking UI that expects it,
// though a real app calculates it dynamically.
let realtimeChannel: any = null;

export const useAppStore = create<AppState>((set, get) => ({
  isLoading: true,
  incidents: [],
  staff: [],
  guests: [],
  alerts: [],
  
  activeIncidentId: null,
  sidebarOpen: true,
  currentFloor: 14,
  conditionLevel: 'red',
  elapsedSeconds: 0,

  hydrate: async () => {
    try {
      set({ isLoading: true });
      const { incidents, staff, guests, alerts } = await api.fetchAll();
      
      const activeId = incidents.length > 0 ? incidents[0].id : null;
      set({ incidents, staff, guests, alerts, activeIncidentId: activeId, isLoading: false });

      // Setup Realtime subscriptions if not already setup
      if (!realtimeChannel) {
        realtimeChannel = supabase
          .channel('schema-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
            set((state) => {
              if (payload.eventType === 'INSERT') {
                const newInc = mapIncident(payload.new);
                if (!state.incidents.find(i => i.id === newInc.id)) {
                  return { incidents: [newInc, ...state.incidents] };
                }
              } else if (payload.eventType === 'UPDATE') {
                return {
                  incidents: state.incidents.map((inc) => 
                    inc.id === payload.new.id ? { ...mapIncident(payload.new), timeline: inc.timeline } : inc
                  )
                };
              } else if (payload.eventType === 'DELETE') {
                return { incidents: state.incidents.filter(i => i.id !== payload.old.id) };
              }
              return state;
            });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_events' }, (payload) => {
            set((state) => {
              if (payload.eventType === 'INSERT') {
                const te = mapTimelineEvent(payload.new);
                return {
                  incidents: state.incidents.map(inc => {
                    if (inc.id === payload.new.incident_id) {
                      if (!inc.timeline.find(t => t.id === te.id)) {
                        return { ...inc, timeline: [te, ...inc.timeline] };
                      }
                    }
                    return inc;
                  })
                };
              }
              return state;
            });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, (payload) => {
            set((state) => {
              if (payload.eventType === 'INSERT') {
                const s = mapStaff(payload.new);
                if (!state.staff.find(x => x.id === s.id)) return { staff: [...state.staff, s] };
              } else if (payload.eventType === 'UPDATE') {
                return { staff: state.staff.map(x => x.id === payload.new.id ? mapStaff(payload.new) : x) };
              } else if (payload.eventType === 'DELETE') {
                return { staff: state.staff.filter(x => x.id !== payload.old.id) };
              }
              return state;
            });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, (payload) => {
            set((state) => {
              if (payload.eventType === 'INSERT') {
                const g = mapGuest(payload.new);
                if (!state.guests.find(x => x.id === g.id)) return { guests: [...state.guests, g] };
              } else if (payload.eventType === 'UPDATE') {
                return { guests: state.guests.map(x => x.id === payload.new.id ? mapGuest(payload.new) : x) };
              } else if (payload.eventType === 'DELETE') {
                return { guests: state.guests.filter(x => x.id !== payload.old.id) };
              }
              return state;
            });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
            set((state) => {
              if (payload.eventType === 'INSERT') {
                const a = mapAlert(payload.new);
                if (!state.alerts.find(x => x.id === a.id)) return { alerts: [a, ...state.alerts] };
              } else if (payload.eventType === 'UPDATE') {
                return { alerts: state.alerts.map(x => x.id === payload.new.id ? mapAlert(payload.new) : x) };
              } else if (payload.eventType === 'DELETE') {
                return { alerts: state.alerts.filter(x => x.id !== payload.old.id) };
              }
              return state;
            });
          })
          .subscribe();
      }
    } catch (e) {
      console.error('Hydration failed:', e);
      set({ isLoading: false });
    }
  },

  setActiveIncident: (id) => set({ activeIncidentId: id }),

  addTimelineEvent: (incidentId, event) => {
    // Optimistic Update
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId
          ? { ...inc, timeline: [event, ...inc.timeline] }
          : inc
      ),
    }));
    // Persist
    api.addTimelineEvent(incidentId, event).catch(console.error);
  },

  respondToIncident: (incidentId) => {
    const prev = get().incidents.find((i) => i.id === incidentId);
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, status: 'responding' as const } : inc
      ),
    }));
    api.updateIncidentStatus(incidentId, 'responding').catch((e) => {
      console.error('respondToIncident failed:', e);
      if (prev) set((state) => ({
        incidents: state.incidents.map((inc) => inc.id === incidentId ? { ...inc, status: prev.status } : inc),
      }));
      alert(`Could not mark responding: ${(e as Error).message}`);
    });
  },

  escalateIncident: (incidentId) => {
    const incToEscalate = get().incidents.find(i => i.id === incidentId);
    if (!incToEscalate) return;
    const prevSeverity = incToEscalate.severity;

    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, severity: Math.min(4, inc.severity + 1) as 1 | 2 | 3 | 4 } : inc
      ),
    }));
    api.escalateIncident(incidentId, incToEscalate.severity).catch((e) => {
      console.error('escalateIncident failed:', e);
      set((state) => ({
        incidents: state.incidents.map((inc) => inc.id === incidentId ? { ...inc, severity: prevSeverity } : inc),
      }));
      alert(`Could not escalate: ${(e as Error).message}`);
    });
  },

  resolveIncident: (incidentId) => {
    const prev = get().incidents.find((i) => i.id === incidentId);
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, status: 'resolved' as const } : inc
      ),
    }));
    api.updateIncidentStatus(incidentId, 'resolved').catch((e) => {
      console.error('resolveIncident failed:', e);
      if (prev) set((state) => ({
        incidents: state.incidents.map((inc) => inc.id === incidentId ? { ...inc, status: prev.status } : inc),
      }));
      alert(`Could not resolve: ${(e as Error).message}`);
    });
  },

  updateStaffStatus: (staffId, status) => {
    const prev = get().staff.find((s) => s.id === staffId);
    set((state) => ({
      staff: state.staff.map((s) => (s.id === staffId ? { ...s, status } : s)),
    }));
    api.updateStaffStatus(staffId, status).catch((e) => {
      console.error('updateStaffStatus failed:', e);
      if (prev) {
        set((state) => ({
          staff: state.staff.map((s) => (s.id === staffId ? { ...s, status: prev.status } : s)),
        }));
      }
      alert(`Could not update status: ${(e as Error).message}`);
    });
  },

  addStaff: async (input) => {
    try {
      const created = await api.createStaff(input);
      set((state) => ({
        staff: state.staff.find((s) => s.id === created.id) ? state.staff : [...state.staff, created],
      }));
      return created;
    } catch (e) {
      console.error('addStaff failed:', e);
      alert(`Could not add staff: ${(e as Error).message}`);
      return null;
    }
  },

  deployStaff: async (staffId, incidentId, opts) => {
    // Optimistic
    set((state) => ({
      staff: state.staff.map((s) =>
        s.id === staffId
          ? { ...s, currentIncident: incidentId, status: opts?.onScene ? 'deployed' : 'en-route', eta: opts?.eta || (opts?.onScene ? 'On Scene' : 'ETA 2m') }
          : s
      ),
    }));
    try {
      await api.deployStaff(staffId, incidentId, opts);
    } catch (e) {
      console.error('deployStaff failed:', e);
    }
  },

  recallStaff: async (staffId) => {
    set((state) => ({
      staff: state.staff.map((s) =>
        s.id === staffId ? { ...s, currentIncident: undefined, status: 'available', eta: undefined } : s
      ),
    }));
    try {
      await api.recallStaff(staffId);
    } catch (e) {
      console.error('recallStaff failed:', e);
    }
  },

  updateGuestStatus: (guestId, guestStatus) => {
    set((state) => ({
      guests: state.guests.map((g) =>
        g.id === guestId ? { ...g, status: guestStatus } : g
      ),
    }));
  },

  acknowledgeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      ),
    }));
    api.acknowledgeAlert(id).catch(console.error);
  },

  unacknowledgedCount: () => get().alerts.filter((a) => !a.acknowledged).length,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentFloor: (floor) => set({ currentFloor: floor }),
  startDrill: () => {
    api.createDrillIncident().catch(console.error);
  },
}));

// Update elapsedSeconds every second based on active incident
setInterval(() => {
  const state = useAppStore.getState();
  const activeIncident = state.incidents.find((i) => i.id === state.activeIncidentId) || state.incidents[0];

  if (activeIncident && activeIncident.reportedAt) {
    const seconds = differenceInSeconds(new Date(), new Date(activeIncident.reportedAt));
    if (seconds !== state.elapsedSeconds) {
      useAppStore.setState({ elapsedSeconds: Math.max(0, seconds) });
    }
  } else if (state.elapsedSeconds !== 0) {
    useAppStore.setState({ elapsedSeconds: 0 });
  }
}, 1000);
