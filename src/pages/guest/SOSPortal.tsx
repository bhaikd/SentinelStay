import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const categories = [
  { id: 'medical', label: 'Medical', icon: 'medical_services', color: 'from-red-500 to-red-700', desc: 'Injury, illness, or health crisis' },
  { id: 'fire', label: 'Fire', icon: 'local_fire_department', color: 'from-orange-500 to-orange-700', desc: 'Smoke, flames, or burning smell' },
  { id: 'security', label: 'Security', icon: 'shield', color: 'from-blue-500 to-blue-700', desc: 'Threat, intrusion, or suspicious activity' },
  { id: 'other', label: 'Other', icon: 'warning', color: 'from-amber-500 to-amber-700', desc: 'Gas leak, flood, structural, or other' },
];

export default function SOSPortal() {
  const [step, setStep] = useState<'ready' | 'category' | 'confirm' | 'active'>('ready');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [silentMode, setSilentMode] = useState(false);
  const navigate = useNavigate();

  const roomNumber = '1402';
  const floorNumber = 14;
  const building = 'Tower A';

  const handleSOS = () => setStep('category');

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setStep('confirm');
  };

  const handleConfirm = () => {
    setStep('active');
    setTimeout(() => navigate('/guest/chat'), 2000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
      <AnimatePresence mode="wait">
        {/* Step 1: Ready — Big SOS Button */}
        {step === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center text-center"
          >
            {/* Auto-detected location */}
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-8">
              <span className="material-symbols-outlined text-blue-400 text-sm">location_on</span>
              <span className="text-sm text-blue-200">Room {roomNumber} • Floor {floorNumber} • {building}</span>
            </div>

            <h1 className="text-2xl font-bold mb-2">Need Emergency Help?</h1>
            <p className="text-sm text-blue-200/60 mb-12 max-w-xs">Press the button below to alert hotel staff and emergency services immediately.</p>

            {/* SOS Button */}
            <button
              onClick={handleSOS}
              className="relative w-44 h-44 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-2xl shadow-red-500/30 sos-pulse hover:scale-105 transition-transform active:scale-95"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>sos</span>
                <span className="text-lg font-black tracking-wider">SOS</span>
              </div>
            </button>

            <p className="text-xs text-blue-300/40 mt-8">Tap to request immediate assistance</p>

            {/* Silent Mode Toggle */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setSilentMode(!silentMode)}
                className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${silentMode ? 'bg-red-500' : 'bg-white/20'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${silentMode ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-xs text-blue-300/60">Silent Mode {silentMode ? '(Active)' : ''}</span>
              <span className="material-symbols-outlined text-sm text-blue-300/40">info</span>
            </div>
          </motion.div>
        )}

        {/* Step 2: Category Selection */}
        {step === 'category' && (
          <motion.div
            key="category"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full max-w-sm"
          >
            <button onClick={() => setStep('ready')} className="flex items-center gap-1 text-sm text-blue-300/60 mb-6">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back
            </button>
            <h2 className="text-xl font-bold mb-2">What type of emergency?</h2>
            <p className="text-sm text-blue-200/50 mb-6">Select the category that best describes your situation.</p>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                  </div>
                  <h3 className="text-base font-bold mb-1">{cat.label}</h3>
                  <p className="text-[11px] text-blue-200/40 leading-snug">{cat.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-400 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {categories.find(c => c.id === selectedCategory)?.icon}
              </span>
            </div>
            <h2 className="text-xl font-bold mb-2">Confirm Emergency Alert</h2>
            <p className="text-sm text-blue-200/50 mb-2">
              This will alert hotel staff and emergency services about a <strong className="text-white">{selectedCategory}</strong> emergency.
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-sm text-left border border-white/10">
              <div className="flex justify-between mb-2">
                <span className="text-blue-300/60">Location</span>
                <span>Room {roomNumber}, Floor {floorNumber}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-blue-300/60">Type</span>
                <span className="capitalize">{selectedCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300/60">Mode</span>
                <span>{silentMode ? '🔇 Silent' : '🔊 Standard'}</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-gradient-to-r from-red-500 to-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl transition-all active:scale-[0.98] mb-3"
            >
              SEND ALERT NOW
            </button>
            <button onClick={() => setStep('category')} className="text-sm text-blue-300/50 hover:text-blue-300">
              Cancel
            </button>
          </motion.div>
        )}

        {/* Step 4: Alert Active */}
        {step === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 alert-ring">
              <span className="material-symbols-outlined text-emerald-400 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Alert Sent!</h2>
            <p className="text-sm text-blue-200/50 mb-6">Help is on the way. A staff member will contact you shortly.</p>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
              <div className="text-xs text-blue-300/50 uppercase tracking-wider mb-1">Estimated Response Time</div>
              <div className="text-3xl font-black text-emerald-400 font-mono">~2:00</div>
            </div>

            <div className="flex items-center justify-center gap-3 text-sm text-blue-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connecting you to staff...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
