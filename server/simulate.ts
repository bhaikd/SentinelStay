import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE credentials for the simulation worker.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initial data to load (simulating the mockData.ts)
const mockIncidents = [
  {
    id: 'INC-042',
    title: 'Fire Alarm Initiated',
    type: 'fire',
    severity: 4,
    status: 'active',
    location_building: 'Main Tower',
    location_floor: 14,
    location_room: '1402',
    location_x: 210,
    location_y: 60,
    reported_by: 'Smoke Detector 14-A',
    description: 'Multiple smoke detectors triggered in corridor A, outside room 1402. High probability of active fire.',
    assigned_units: ['Unit-04', 'FDNY-E7'],
    casualties: 0,
    evacuated: 12,
    guests_affected: 45,
  },
  {
    id: 'INC-041',
    title: 'Medical Emergency',
    type: 'medical',
    severity: 3,
    status: 'responding',
    location_building: 'South Wing',
    location_floor: 3,
    location_room: 'Pool Deck',
    location_x: 400,
    location_y: 120,
    reported_by: 'Guest SOS',
    description: 'Guest reported chest pains. Conscious but struggling to breathe. Staff on scene initiating CPR.',
    assigned_units: ['Unit-02', 'Medical-1'],
    casualties: 1,
    evacuated: 0,
    guests_affected: 0,
  }
];

const mockTimeline = [
  { id: 'tl-1', incident_id: 'INC-042', timestamp: '14:32:00', message: 'Initial alarm triggered by smoke detector 14-A.', type: 'alert', author: 'System' },
  { id: 'tl-2', incident_id: 'INC-042', timestamp: '14:32:15', message: 'Secondary alarm triggered by heat sensor 1402.', type: 'escalation', author: 'System' },
  { id: 'tl-3', incident_id: 'INC-042', timestamp: '14:33:00', message: 'Automated 911 dispatch initiated.', type: 'dispatch', author: 'System' },
];

const mockStaff = [
  { id: 'STF-001', name: 'Sarah Chen', role: 'security', unit: 'Unit 04', status: 'deployed', location_building: 'Main', location_floor: 14, location_x: 100, location_y: 50, phone: '+1 555-0101', current_incident: 'INC-042', eta: 'On Scene' },
  { id: 'STF-002', name: 'Marcus Johnson', role: 'medical', unit: 'Medical 1', status: 'deployed', location_building: 'South', location_floor: 3, location_x: 400, location_y: 120, phone: '+1 555-0102', current_incident: 'INC-041', eta: 'On Scene' },
];

const mockGuests = [
  { id: 'GST-1402', name: 'John Doe', room: '1402', building: 'Main Tower', floor: 14, status: 'missing', language: 'English', vip: false },
  { id: 'GST-1403', name: 'Alice Smith', room: '1403', building: 'Main Tower', floor: 14, status: 'evacuated', language: 'English', vip: true },
];

const mockAlerts = [
  { id: 'ALT-101', type: 'system', severity: 4, message: 'CRITICAL: Fire suppression system pressure drop on Floor 14.', location: 'Main Tower, Floor 14', timestamp: '14:34:10', incident_id: 'INC-042' },
  { id: 'ALT-102', type: 'sos', severity: 4, message: 'GUEST SOS: Possible entrapment reported.', location: 'Room 1402', timestamp: '14:35:00', incident_id: 'INC-042' },
];

// Seed the database
async function seedInitialData() {
  console.log("Seeding database with initial data...");
  await supabase.from('incidents').upsert(mockIncidents);
  await supabase.from('timeline_events').upsert(mockTimeline);
  await supabase.from('staff').upsert(mockStaff);
  await supabase.from('guests').upsert(mockGuests);
  await supabase.from('alerts').upsert(mockAlerts);
  console.log("Database seeded successfully.");
}

async function runSimulation() {
  console.log("Starting simulation loop...");

  // Every 30 seconds we add a new timeline event or alert to test Realtime
  let tick = 0;
  setInterval(async () => {
    tick++;
    console.log(`Simulation tick ${tick}`);

    // Add a timeline event to INC-042
    await supabase.from('timeline_events').insert({
      id: `sim-tl-${Date.now()}`,
      incident_id: 'INC-042',
      timestamp: new Date().toTimeString().slice(0, 8),
      message: `System status check complete. Auto log ${tick}.`,
      type: 'update',
      author: 'Backend Simulator'
    });

    if (tick % 3 === 0) {
      await supabase.from('alerts').insert({
        id: `sim-alt-${Date.now()}`,
        type: 'sensor',
        severity: 2,
        message: `High temp warning on floor 15 (Radiant heat from 14). Tick ${tick}`,
        location: 'Main Tower, Floor 15',
        timestamp: new Date().toTimeString().slice(0, 8),
        incident_id: 'INC-042'
      });
    }

  }, 10000); // Trigger every 10 seconds for faster testing
}

async function main() {
  // First clear old data if any (optional, but good for fresh run)
  await seedInitialData();
  runSimulation();
}

main().catch(console.error);
