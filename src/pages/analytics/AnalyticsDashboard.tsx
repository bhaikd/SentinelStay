import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { mockAnalyticsData } from '../../data/mockData';

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('6m');
  const { responseTimeTrend, incidentsByType, incidentsByFloor, drillPerformance, kpis } = mockAnalyticsData;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
            <span className="text-lg font-bold">SentinelStay</span>
          </Link>
          <span className="text-slate-600">|</span>
          <span className="text-sm text-purple-400 font-semibold">Analytics & Reporting</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
            {['1m', '3m', '6m', '1y'].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${dateRange === r ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Link
            to="/command"
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Command
          </Link>
          <button className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-500 transition-colors">
            <span className="material-symbols-outlined text-base">download</span>
            Export Report
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'MTTD', value: kpis.mttd, icon: 'timer', color: 'text-emerald-400', note: 'Target: 30s' },
            { label: 'MTTR', value: kpis.mttr, icon: 'speed', color: 'text-emerald-400', note: 'Target: 2m' },
            { label: 'Ack Time', value: kpis.alertAckTime, icon: 'notifications', color: 'text-emerald-400', note: 'Target: 15s' },
            { label: 'False Positive', value: kpis.falsePositiveRate, icon: 'block', color: 'text-emerald-400', note: 'Target: <5%' },
            { label: 'Staff Adoption', value: kpis.staffAdoption, icon: 'groups', color: 'text-emerald-400', note: 'Target: >90%' },
            { label: 'Guest Score', value: `${kpis.guestSatisfaction}/5`, icon: 'star', color: 'text-amber-400', note: 'Target: 4.5' },
            { label: 'Uptime', value: kpis.uptime, icon: 'cloud_done', color: 'text-emerald-400', note: 'SLA: 99.99%' },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-center"
            >
              <span className={`material-symbols-outlined text-xl ${kpi.color} block mb-2`}>{kpi.icon}</span>
              <div className={`text-lg font-black ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{kpi.label}</div>
              <div className="text-[9px] text-slate-600 mt-1">{kpi.note}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Response Time Trend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Response Time Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Avg minutes from alert to coordinated response</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="material-symbols-outlined text-sm">trending_down</span>
                Improving
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={responseTimeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} unit="m" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line type="monotone" dataKey="avgResponse" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: '#818cf8', strokeWidth: 0, r: 4 }} name="Avg Response" />
                <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Incident Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-slate-900 rounded-xl border border-slate-800 p-5"
          >
            <h3 className="text-sm font-bold text-white mb-1">Incident Types</h3>
            <p className="text-xs text-slate-400 mb-4">Distribution by category</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={incidentsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {incidentsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {incidentsByType.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-slate-400">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Incident Heatmap by Floor */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900 rounded-xl border border-slate-800 p-5"
          >
            <h3 className="text-sm font-bold text-white mb-1">Incident Heatmap by Floor</h3>
            <p className="text-xs text-slate-400 mb-4">Total incidents per floor (rolling 6 months)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentsByFloor} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#475569" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="floor" stroke="#475569" tick={{ fontSize: 10 }} width={24} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {incidentsByFloor.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.count >= 8 ? '#ef4444' : entry.count >= 6 ? '#f59e0b' : '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Drill Performance */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-slate-900 rounded-xl border border-slate-800 p-5"
          >
            <h3 className="text-sm font-bold text-white mb-1">Drill Performance</h3>
            <p className="text-xs text-slate-400 mb-4">Score out of 100 per drill exercise</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={drillPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="drill" stroke="#475569" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} domain={[50, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {drillPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 85 ? '#10b981' : entry.score >= 75 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Summary Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 rounded-xl border border-slate-800 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Incident Summary — Current Month</h3>
            <button className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Full Report
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left pb-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Incident ID</th>
                  <th className="text-left pb-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Type</th>
                  <th className="text-left pb-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Location</th>
                  <th className="text-left pb-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Response Time</th>
                  <th className="text-left pb-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</th>
                  <th className="text-left pb-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {[
                  { id: 'INC-042', type: 'Fire', location: 'Tower A, Fl 14', response: 'Ongoing', status: 'Active', severity: 4 },
                  { id: 'INC-041', type: 'Medical', location: 'Tower A, Fl 3', response: '8m 12s', status: 'Responding', severity: 3 },
                  { id: 'INC-040', type: 'Security', location: 'Tower B, Fl 1', response: '5m 45s', status: 'Responding', severity: 2 },
                  { id: 'INC-039', type: 'Medical', location: 'Tower A, Fl 7', response: '1m 52s', status: 'Resolved', severity: 2 },
                  { id: 'INC-038', type: 'Other', location: 'Tower B, Fl 3', response: '3m 11s', status: 'Resolved', severity: 1 },
                ].map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono text-slate-300">{row.id}</td>
                    <td className="py-3 text-slate-300">{row.type}</td>
                    <td className="py-3 text-slate-400">{row.location}</td>
                    <td className="py-3 font-mono text-slate-300">{row.response}</td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        row.status === 'Active' ? 'bg-red-500/20 text-red-400' :
                        row.status === 'Responding' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map((s) => (
                          <span key={s} className={`w-2 h-2 rounded-sm ${s <= row.severity ? 'bg-red-500' : 'bg-slate-700'}`} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
