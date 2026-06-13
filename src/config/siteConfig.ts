/**
 * Static facility configuration for the deployed property.
 * These values describe physical infrastructure (number of floors, hazmat
 * storage rooms, shut-off valve locations, etc.) — they are stable facts
 * about the building, not runtime data, so they live in source control
 * rather than the database.
 *
 * For a multi-tenant deployment, replace this file with a `properties` table
 * fetch in `src/services/api.ts` and pass the active property id through.
 */
export interface BuildingConfig {
  name: string;
  address: string;
  floors: number;
  rooms: number;
  builtYear: number;
  totalArea: string;
  fireSuppressionSystem: string;
  emergencyExits: number;
  elevators: number;
  stairwells: number;
  hazmatLocations: string[];
  shutOffValves: { gas: string; water: string; electrical: string };
  assembled: string;
}

export const BUILDING: BuildingConfig = {
  name: 'SentinelStay Central — Tower A',
  address: '350 5th Avenue, New York, NY 10118',
  floors: 18,
  rooms: 450,
  builtYear: 2019,
  totalArea: '285,000 sq ft',
  fireSuppressionSystem: 'Wet Sprinkler (All Floors)',
  emergencyExits: 8,
  elevators: 6,
  stairwells: 4,
  hazmatLocations: [
    'B1 — Chemical Storage',
    'Floor 1 — Pool Chemicals',
    'Roof — HVAC Refrigerants',
  ],
  shutOffValves: {
    gas: 'B1 — Utility Room A',
    water: 'B1 — Utility Room B',
    electrical: 'B1 — Main Panel Room',
  },
  assembled: 'Parking Lot A (Primary), Garden Terrace (Secondary)',
};

export interface PropertyMeta {
  id: string;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
}

export const CURRENT_PROPERTY: PropertyMeta = {
  id: 'P001',
  name: 'SentinelStay Central',
  location: 'New York, NY',
  coordinates: { lat: 40.7128, lng: -74.006 },
};
