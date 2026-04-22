import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { severityColor, severityLabel, typeIcon } from '../../utils/formatting';

export default function IncidentLog() {
  const { incidents, setActiveIncident } = useAppStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = incidents.filter((inc) => {
    const matchSearch = inc.title.toLowerCase().includes(search.toLowerCase()) || inc.id.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || inc.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Incident Log</h1>
          <p className="text-sm text-on-surface-variant mt-1">All incidents — current session</p>
        </div>
        <button className="flex items-center gap-2 bg-surface-container text-on-surface-variant px-4 py-2 rounded-lg text-sm hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-base">download</span>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'fire', 'medical', 'security', 'other'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors capitalize ${typeFilter === t ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-container-low border-b border-outline-variant/10">
            <tr>
              {['ID', 'Type', 'Title', 'Location', 'Severity', 'Status', 'Reported At', 'Units'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {filtered.map((inc, i) => (
              <motion.tr
                key={inc.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-surface-container-low transition-colors cursor-pointer"
                onClick={() => setActiveIncident(inc.id)}
              >
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{inc.id}</td>
                <td className="px-4 py-3">
                  <span className="material-symbols-outlined text-lg text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>{typeIcon(inc.type)}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-on-surface">{inc.title}</td>
                <td className="px-4 py-3 text-on-surface-variant">{inc.location.building}, Fl {inc.location.floor}, Rm {inc.location.room}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${severityColor(inc.severity)}`}>
                    {severityLabel(inc.severity).split(' ')[0]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${inc.status === 'active' ? 'bg-red-100 text-red-700' : inc.status === 'responding' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {inc.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{inc.reportedAt.split('T')[1]}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {inc.assignedUnits.map((u) => (
                      <span key={u} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{u}</span>
                    ))}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
