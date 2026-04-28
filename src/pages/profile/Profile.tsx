import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';

export default function Profile() {
  const { staff } = useAppStore();
  
  // We'll use the first staff member or a generic Commander Alpha profile
  const currentUser = staff.find(s => s.id === 'U02') || {
    name: 'Commander Alpha',
    role: 'Central Commander',
    unit: 'Command Center',
    status: 'on-duty',
    phone: '+1 (555) 019-8472',
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">User Profile</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage your account and view activity</p>
      </div>

      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - ID Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm flex flex-col items-center text-center"
        >
          <div className="w-32 h-32 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-4 relative shadow-inner">
            <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield_person
            </span>
            <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-surface-container-lowest" />
          </div>
          <h2 className="text-xl font-bold text-on-surface">{currentUser.name}</h2>
          <p className="text-sm text-on-surface-variant font-medium capitalize mt-1">{currentUser.role}</p>
          
          <div className="mt-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
            {currentUser.unit}
          </div>

          <div className="w-full h-px bg-outline-variant/10 my-6" />

          <div className="w-full space-y-3 text-sm text-left">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">badge</span> ID
              </span>
              <span className="font-mono text-on-surface font-medium">OP-7734</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">verified</span> Clearance
              </span>
              <span className="font-bold text-tertiary">LEVEL 4</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">schedule</span> Shift
              </span>
              <span className="font-medium text-on-surface">08:00 - 20:00</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-2 flex flex-col gap-6"
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
            <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">contact_mail</span>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Direct Line</p>
                <p className="text-sm font-semibold text-on-surface">{currentUser.phone}</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Email</p>
                <p className="text-sm font-semibold text-on-surface">alpha@sentinelstay.com</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Radio Channel</p>
                <p className="text-sm font-semibold text-on-surface">CH-1 (Command)</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Office</p>
                <p className="text-sm font-semibold text-on-surface">Command Center, Fl 2</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm flex-1">
            <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">history</span>
              Recent Activity
            </h3>
            <div className="space-y-4">
              {[
                { time: '10 mins ago', text: 'Acknowledged Fire Alarm on Floor 14' },
                { time: '1 hour ago', text: 'Initiated System Drill for South Wing' },
                { time: '3 hours ago', text: 'Shift started. System login successful.' },
                { time: 'Yesterday', text: 'Resolved Medical Emergency (INC-041)' },
              ].map((activity, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm text-on-surface">{activity.text}</p>
                    <p className="text-xs text-on-surface-variant">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
