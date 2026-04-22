import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mockProperties } from '../../data/mockData';
import { useAppStore } from '../../store/appStore';

const propertyStatusColor = (s: string) =>
  s === 'critical' ? 'bg-red-500' : s === 'alert' ? 'bg-amber-500' : 'bg-emerald-500';

const propertyBorderColor = (s: string) =>
  s === 'critical' ? 'border-red-500/30 bg-red-500/5' : s === 'alert' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/20 bg-surface-container-lowest';

export default function CorporateDashboard() {
  const { incidents } = useAppStore();
  const [selectedProperty, setSelectedProperty] = useState(mockProperties[0]);

  const totalIncidents = mockProperties.reduce((a, p) => a + p.activeIncidents, 0);
  const criticalProperties = mockProperties.filter((p) => p.status === 'critical').length;
  const totalOccupancy = Math.round(mockProperties.reduce((a, p) => a + p.occupancy, 0) / mockProperties.length);
  const totalRooms = mockProperties.reduce((a, p) => a + p.rooms, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
            <span className="text-lg font-bold">SentinelStay</span>
          </Link>
          <span className="text-slate-600">|</span>
          <span className="text-sm text-teal-400 font-semibold">Corporate Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">Director Tanaka</span>
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-teal-400 text-lg">account_circle</span>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Properties', value: mockProperties.length, icon: 'apartment', color: 'text-teal-400', bg: 'bg-teal-500/10' },
            { label: 'Active Incidents', value: totalIncidents, icon: 'crisis_alert', color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Critical Properties', value: criticalProperties, icon: 'warning', color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Avg Occupancy', value: `${totalOccupancy}%`, icon: 'bed', color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-slate-900 rounded-xl p-5 border border-slate-800"
            >
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <span className={`material-symbols-outlined text-xl ${kpi.color}`}>{kpi.icon}</span>
              </div>
              <div className={`text-3xl font-black ${kpi.color} mb-1`}>{kpi.value}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Portfolio — {mockProperties.length} Properties</h2>
            {mockProperties.map((prop, i) => (
              <motion.button
                key={prop.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => setSelectedProperty(prop)}
                className={`w-full text-left bg-slate-900 rounded-xl p-4 border transition-all hover:border-slate-600 ${
                  selectedProperty.id === prop.id ? 'border-teal-500/50 ring-1 ring-teal-500/20' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${propertyStatusColor(prop.status)}`} />
                    <span className="text-sm font-bold text-white">{prop.name}</span>
                  </div>
                  {prop.activeIncidents > 0 && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                      {prop.activeIncidents} INC
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {prop.location}
                  </span>
                  <span>{prop.occupancy}% occ.</span>
                </div>
                {/* Occupancy bar */}
                <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${prop.status === 'critical' ? 'bg-red-500' : prop.status === 'alert' ? 'bg-amber-500' : 'bg-teal-500'}`}
                    style={{ width: `${prop.occupancy}%` }}
                  />
                </div>
              </motion.button>
            ))}
          </div>

          {/* Property Detail + Map Placeholder */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selected Property Detail */}
            <motion.div
              key={selectedProperty.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded-xl border border-slate-800 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedProperty.name}</h3>
                  <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {selectedProperty.location}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  selectedProperty.status === 'critical' ? 'bg-red-500/20 text-red-400' :
                  selectedProperty.status === 'alert' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {selectedProperty.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Rooms', value: selectedProperty.rooms, icon: 'door_front' },
                  { label: 'Occupancy', value: `${selectedProperty.occupancy}%`, icon: 'bed' },
                  { label: 'Active Incidents', value: selectedProperty.activeIncidents, icon: 'crisis_alert' },
                  { label: 'Staff On Duty', value: selectedProperty.staffOnDuty, icon: 'badge' },
                ].map((m) => (
                  <div key={m.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <span className="material-symbols-outlined text-slate-400 text-xl mb-1 block">{m.icon}</span>
                    <div className="text-xl font-bold text-white">{m.value}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* World Map visualization (stylised) */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Portfolio Map</h3>
              <div className="relative bg-slate-800/30 rounded-xl overflow-hidden" style={{ height: '260px' }}>
                {/* Stylised US map SVG */}
                <svg viewBox="0 0 800 400" className="w-full h-full opacity-20">
                  <path d="M 150 80 L 700 80 L 700 300 L 150 300 Z" fill="none" stroke="#475569" strokeWidth="1" />
                </svg>

                {/* Property pins overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* NY */}
                    <PropertyPin name="Central" location="New York" status="critical" style={{ top: '28%', left: '72%' }} />
                    {/* Miami */}
                    <PropertyPin name="Marina" location="Miami" status="nominal" style={{ top: '65%', left: '64%' }} />
                    {/* LA */}
                    <PropertyPin name="Pacific" location="Los Angeles" status="alert" style={{ top: '38%', left: '14%' }} />
                    {/* Chicago */}
                    <PropertyPin name="Lakeside" location="Chicago" status="nominal" style={{ top: '30%', left: '55%' }} />
                    {/* DC */}
                    <PropertyPin name="Capitol" location="Washington D.C." status="nominal" style={{ top: '35%', left: '69%' }} />
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-3 right-3 flex gap-3 text-[10px] text-slate-400 bg-slate-900/80 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Critical</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Alert</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Nominal</span>
                </div>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Compliance Status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Fire Safety Certification', status: 'compliant', expiry: '2026-12-31' },
                  { label: 'SOC 2 Type II', status: 'compliant', expiry: '2026-09-15' },
                  { label: 'GDPR Data Processing', status: 'compliant', expiry: '2027-01-01' },
                  { label: 'OSHA Workplace Safety', status: 'review', expiry: '2026-05-01' },
                  { label: 'HIPAA Alignment', status: 'compliant', expiry: '2027-03-20' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.status === 'compliant' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-slate-300">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">Exp: {item.expiry}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.status === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyPin({ name, location, status, style }: { name: string; location: string; status: string; style: React.CSSProperties }) {
  const dotColor = status === 'critical' ? 'bg-red-500' : status === 'alert' ? 'bg-amber-500' : 'bg-emerald-500';
  const ringColor = status === 'critical' ? 'bg-red-500/20' : status === 'alert' ? 'bg-amber-500/20' : 'bg-emerald-500/10';

  return (
    <div className="absolute flex flex-col items-center" style={style}>
      <div className={`w-8 h-8 rounded-full ${ringColor} flex items-center justify-center ${status === 'critical' ? 'animate-pulse' : ''}`}>
        <div className={`w-4 h-4 rounded-full ${dotColor} shadow-lg`} />
      </div>
      <div className="mt-1 text-center">
        <div className="text-[10px] font-bold text-white whitespace-nowrap">{name}</div>
        <div className="text-[9px] text-slate-500 whitespace-nowrap">{location}</div>
      </div>
    </div>
  );
}
