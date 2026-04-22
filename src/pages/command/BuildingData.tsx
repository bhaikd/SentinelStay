import React from 'react';
import { buildingData } from '../../data/mockData';

export default function BuildingData() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Building Data</h1>
          <p className="text-sm text-on-surface-variant mt-1">Pre-loaded safety & infrastructure information</p>
        </div>
        <button className="flex items-center gap-2 bg-surface-container text-on-surface-variant px-4 py-2 rounded-lg text-sm hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-base">edit</span>
          Edit Building Info
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* General Info */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-primary">apartment</span>
            General Information
          </h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Building Name', value: buildingData.name },
              { label: 'Address', value: buildingData.address },
              { label: 'Total Floors', value: buildingData.floors + ' floors' },
              { label: 'Total Rooms', value: buildingData.rooms + ' rooms' },
              { label: 'Total Area', value: buildingData.totalArea },
              { label: 'Year Built', value: buildingData.builtYear.toString() },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4 py-2 border-b border-outline-variant/5 last:border-0">
                <span className="text-on-surface-variant">{item.label}</span>
                <span className="text-on-surface font-medium text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Systems */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-emerald-600">verified_user</span>
            Safety Systems
          </h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Fire Suppression', value: buildingData.fireSuppressionSystem, ok: true },
              { label: 'Emergency Exits', value: buildingData.emergencyExits + ' exits', ok: true },
              { label: 'Elevators', value: buildingData.elevators + ' (with fire recall)', ok: true },
              { label: 'Stairwells', value: buildingData.stairwells + ' (pressurised)', ok: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-outline-variant/5 last:border-0">
                <span className="text-on-surface-variant">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-on-surface font-medium">{item.value}</span>
                  <span className="material-symbols-outlined text-emerald-600 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shut-Off Valves */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-amber-600">valve</span>
            Emergency Shut-Offs
          </h2>
          <div className="space-y-3">
            {Object.entries(buildingData.shutOffValves).map(([key, val]) => (
              <div key={key} className="flex items-center gap-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {key === 'gas' ? 'local_fire_department' : key === 'water' ? 'water_drop' : 'electrical_services'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800 capitalize">{key} Main Shut-Off</p>
                  <p className="text-xs text-amber-600">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hazmat Locations */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-tertiary">warning</span>
            Hazardous Material Locations
          </h2>
          <div className="space-y-2">
            {buildingData.hazmatLocations.map((loc) => (
              <div key={loc} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>skull</span>
                </span>
                <span className="text-sm text-red-800 font-medium">{loc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assembly Points */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-emerald-600">groups</span>
            Muster / Assembly Points
          </h2>
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
            <span className="material-symbols-outlined text-emerald-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            <div>
              <p className="text-sm font-bold text-emerald-800">Designated Muster Points</p>
              <p className="text-sm text-emerald-600">{buildingData.assembled}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
