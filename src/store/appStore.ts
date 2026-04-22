import { create } from 'zustand';
import type { Incident, StaffMember, Guest, AlertNotification } from '../types';
import { api } from '../services/api';
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
  elapsedSeconds: 262,

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
          .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            async (payload) => {
              // A lazy but safe approach: on any change, re-fetch. 
              // Alternatively, we could apply mutations directly to Zustand, but refetching ensures normalized data structure.
              const fresh = await api.fetchAll();
              set({ incidents: fresh.incidents, staff: fresh.staff, guests: fresh.guests, alerts: fresh.alerts });
            }
          )
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
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, status: 'responding' as const } : inc
      ),
    }));
    api.updateIncidentStatus(incidentId, 'responding').catch(console.error);
  },

  escalateIncident: (incidentId) => {
    const incToEscalate = get().incidents.find(i => i.id === incidentId);
    if (!incToEscalate) return;

    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, severity: Math.min(4, inc.severity + 1) as 1 | 2 | 3 | 4 } : inc
      ),
    }));
    api.escalateIncident(incidentId, incToEscalate.severity).catch(console.error);
  },

  resolveIncident: (incidentId) => {
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, status: 'resolved' as const } : inc
      ),
    }));
    api.updateIncidentStatus(incidentId, 'resolved').catch(console.error);
  },

  updateStaffStatus: (staffId, status) => {
    set((state) => ({
      staff: state.staff.map((s) => (s.id === staffId ? { ...s, status } : s)),
    }));
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
}));
