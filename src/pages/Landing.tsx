import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { mockProperties } from '../data/mockData';

const roles = [
  {
    id: 'guest',
    label: 'Guest SOS',
    icon: 'sos',
    description: 'One-tap emergency assistance',
    path: '/guest/sos',
    color: 'from-red-600 to-red-800',
    iconBg: 'bg-red-500/20',
    subtitle: 'Scan QR or tap to get help',
  },
  {
    id: 'staff',
    label: 'Staff Dashboard',
    icon: 'badge',
    description: 'Alert management & response',
    path: '/staff',
    color: 'from-blue-600 to-blue-800',
    iconBg: 'bg-blue-500/20',
    subtitle: 'Real-time alerts & task board',
  },
  {
    id: 'command',
    label: 'Command Center',
    icon: 'security',
    description: 'Incident command & coordination',
    path: '/command',
    color: 'from-indigo-600 to-indigo-900',
    iconBg: 'bg-indigo-500/20',
    subtitle: 'Floor plans, staff tracking, live ops',
  },
  {
    id: 'responder',
    label: 'Emergency Services',
    icon: 'local_fire_department',
    description: 'Responder access portal',
    path: '/responder',
    color: 'from-orange-600 to-orange-800',
    iconBg: 'bg-orange-500/20',
    subtitle: 'Building data & live incident feed',
  },
  {
    id: 'corporate',
    label: 'Corporate Dashboard',
    icon: 'corporate_fare',
    description: 'Multi-property oversight',
    path: '/corporate',
    color: 'from-teal-600 to-teal-800',
    iconBg: 'bg-teal-500/20',
    subtitle: 'Portfolio-wide analytics',
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    icon: 'analytics',
    description: 'Performance metrics & trends',
    path: '/analytics',
    color: 'from-purple-600 to-purple-800',
    iconBg: 'bg-purple-500/20',
    subtitle: 'KPIs, heatmaps, drill scores',
  },
];

const stats = [
  { label: 'Properties Protected', value: '1,247', icon: 'apartment' },
  { label: 'Alerts Resolved', value: '52,891', icon: 'check_circle' },
  { label: 'Avg Response Time', value: '1m 48s', icon: 'timer' },
  { label: 'Platform Uptime', value: '99.99%', icon: 'cloud_done' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white overflow-auto">
      {/* Animated grid background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-red-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">SentinelStay</span>
            <p className="text-[10px] text-blue-400 tracking-widest uppercase">Emergency Response Platform</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-blue-300/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          System Operational
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 text-center px-8 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Crisis Coordination Platform for Hospitality
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
            Protect Every Guest.<br />Coordinate Every Response.
          </h1>
          <p className="text-lg text-blue-200/60 max-w-2xl mx-auto">
            Unify distressed guests, on-site staff, management, and emergency services into a single real-time operational picture.
          </p>
        </motion.div>
      </section>

      {/* Live Stats Ticker */}
      <section className="relative z-10 px-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-6 md:gap-12"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-400/40 text-2xl">{stat.icon}</span>
              <div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-[10px] text-blue-300/40 uppercase tracking-widest">{stat.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Role Selection Grid */}
      <section className="relative z-10 px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-center text-sm font-semibold text-blue-300/50 uppercase tracking-widest mb-8">Select Your Role to Enter</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {roles.map((role, i) => (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
                onMouseEnter={() => setHoveredRole(role.id)}
                onMouseLeave={() => setHoveredRole(null)}
                onClick={() => navigate(role.path)}
                className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm p-6 text-left transition-all duration-300 hover:bg-white/10 hover:border-white/15 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${role.iconBg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{role.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-1">{role.label}</h3>
                    <p className="text-xs text-blue-200/40">{role.description}</p>
                    <p className="text-[10px] text-blue-300/30 mt-2 uppercase tracking-wider">{role.subtitle}</p>
                  </div>
                  <span className="material-symbols-outlined text-white/20 group-hover:text-white/60 transition-all group-hover:translate-x-1 text-xl mt-1">arrow_forward</span>
                </div>
                {/* Gradient accent line at bottom */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${role.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
