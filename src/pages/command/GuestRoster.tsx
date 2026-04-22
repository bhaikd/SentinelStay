import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';

const statusColors: Record<string, string> = {
  'in-room': 'bg-blue-100 text-blue-700',
  'evacuated': 'bg-emerald-100 text-emerald-700',
  'missing': 'bg-amber-100 text-amber-700',
  'common-area': 'bg-purple-100 text-purple-700',
  'checked-out': 'bg-gray-100 text-gray-600',
};

export default function GuestRoster() {
  const { guests } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = guests.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.room.includes(search);
    const matchStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const missing = guests.filter((g) => g.status === 'missing').length;
  const evacuated = guests.filter((g) => g.status === 'evacuated').length;
  const inRoom = guests.filter((g) => g.status === 'in-room').length;

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Guest Roster</h1>
          <p className="text-sm text-on-surface-variant mt-1">Real-time guest status & location</p>
        </div>
        {missing > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm font-semibold">
            <span className="material-symbols-outlined text-lg">warning</span>
            {missing} Guest(s) Unaccounted
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Tracked', value: guests.length, color: 'text-on-surface' },
          { label: 'In Room', value: inRoom, color: 'text-blue-700' },
          { label: 'Evacuated', value: evacuated, color: 'text-emerald-600' },
          { label: 'Missing', value: missing, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search by name or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'missing', 'in-room', 'evacuated', 'common-area'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'}`}
            >
              {s === 'all' ? 'All' : s.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Guest Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((guest, i) => (
            <motion.div
              key={guest.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold text-sm">
                    {guest.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-on-surface">{guest.name}</h3>
                      {guest.vip && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">VIP</span>}
                    </div>
                    <p className="text-xs text-on-surface-variant">Room {guest.room} • Floor {guest.floor}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[guest.status] || 'bg-gray-100 text-gray-600'}`}>
                  {guest.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">translate</span>
                  {guest.language}
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">location_searching</span>
                  {guest.lastSeen}
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  {guest.checkIn} → {guest.checkOut}
                </div>
              </div>

              {guest.accessibility.length > 0 && (
                <div className="flex gap-1 mt-3">
                  {guest.accessibility.map((a) => (
                    <span key={a} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                      ♿ {a}
                    </span>
                  ))}
                </div>
              )}

              {guest.status === 'missing' && (
                <div className="mt-3 pt-3 border-t border-outline-variant/10 flex gap-2">
                  <button className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold py-1.5 rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">search</span>
                    Search
                  </button>
                  <button className="flex-1 bg-primary text-on-primary text-xs font-semibold py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">phone</span>
                    Contact
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
