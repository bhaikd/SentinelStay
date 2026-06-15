import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';

export default function SafetyRollCallModal() {
  const { alerts, guests, submitGuestCheckIn } = useAppStore();
  const [submitting, setSubmitting] = useState<'safe' | 'help' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Pinned guest context (Room 1402, Floor 14, Tower A)
  const GUEST_ROOM = '1402';
  const GUEST_FLOOR = 14;

  const currentGuest = guests.find(
    (g) => g.room === GUEST_ROOM && g.floor === GUEST_FLOOR
  );

  // Find any active safety check roll call alerts for our floor
  const activeRollCallAlert = alerts.find((a) => {
    if (a.type !== 'system' || a.acknowledged) return false;
    const match = a.message.match(/Floor (\d+)/);
    const alertFloor = match ? parseInt(match[1], 10) : null;
    return alertFloor === GUEST_FLOOR;
  });

  // Only show check-in modal if a roll call is active and this guest hasn't checked in yet
  const shouldShow =
    activeRollCallAlert &&
    currentGuest &&
    (currentGuest.status === 'in-room' || currentGuest.status === 'common-area');

  const handleCheckIn = async (status: 'evacuated' | 'missing') => {
    if (!currentGuest) return;
    setSubmitting(status === 'evacuated' ? 'safe' : 'help');
    try {
      await submitGuestCheckIn(currentGuest.id, status, currentGuest.name, currentGuest.room);
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        setSubmitting(null);
      }, 3000);
    } catch (e) {
      console.error(e);
      setSubmitting(null);
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="w-full max-w-md bg-slate-900/90 border border-red-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden"
          >
            {/* Top pulsing red warning badge */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />

            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <span className="material-symbols-outlined text-red-500 text-3xl animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>
                emergency_home
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">
              Safety Status Check
            </h2>
            
            <div className="inline-flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 px-3 py-1 rounded-full text-xs text-red-400 font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              EMERGENCY BROADCAST ACTIVE
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-8">
              Hello <strong className="text-white">{currentGuest?.name}</strong>, a safety roll call has been initiated for <strong>Floor {GUEST_FLOOR}</strong>. 
              Please confirm your safety status immediately:
            </p>

            <AnimatePresence mode="wait">
              {showConfirmation ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-emerald-400 flex flex-col items-center gap-2"
                >
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                  <p className="font-bold text-sm">Status Submitted Successfully</p>
                  <p className="text-xs text-slate-400">The command center has been notified.</p>
                </motion.div>
              ) : (
                <motion.div key="buttons" className="space-y-4">
                  <button
                    onClick={() => handleCheckIn('evacuated')}
                    disabled={submitting !== null}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 text-base"
                  >
                    {submitting === 'safe' ? (
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                    {submitting === 'safe' ? 'SUBMITTING…' : 'I AM SAFE & EVACUATED'}
                  </button>

                  <button
                    onClick={() => handleCheckIn('missing')}
                    disabled={submitting !== null}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-600/20 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 text-base"
                  >
                    {submitting === 'help' ? (
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    )}
                    {submitting === 'help' ? 'SUBMITTING…' : 'I NEED HELP / TRAPPED'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 text-[11px] text-slate-500">
              Tower A • Room {GUEST_ROOM} • Real-time Safety Broadcast System
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
