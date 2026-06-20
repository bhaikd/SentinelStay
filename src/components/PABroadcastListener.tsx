import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';

export default function PABroadcastListener() {
  const { alerts } = useAppStore();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isSpeechBlocked, setIsSpeechBlocked] = useState(false);
  const playedIds = useRef<Set<string>>(new Set());

  const GUEST_FLOOR = 14;
  const GUEST_BUILDING = 'Tower A';

  // Filter active (unacknowledged) PA broadcasts for this guest's location
  const activePAAlerts = alerts.filter((a) => {
    if (a.type !== 'system' || a.acknowledged) return false;
    if (!a.message.startsWith('PA_BROADCAST:')) return false;
    const loc = a.location.toLowerCase();
    return loc.includes(`floor ${GUEST_FLOOR}`) && loc.includes(GUEST_BUILDING.toLowerCase());
  });

  // Get the most recent active broadcast that isn't dismissed locally
  const activeAlert = activePAAlerts
    .filter((a) => !dismissedIds.includes(a.id))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  const playSpeech = (text: string, id: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech to prioritize the new one
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/^PA_BROADCAST:\s*/, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    
    // Find a clear english voice if possible
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en-') && (v.name.includes('Google') || v.name.includes('Natural'))
    ) || voices.find((v) => v.lang.startsWith('en-'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeechBlocked(false);
      playedIds.current.add(id);
    };

    utterance.onerror = (e) => {
      console.error('TTS Playback failed:', e);
      if (e.error === 'not-allowed') {
        setIsSpeechBlocked(true);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Process playing any newly-arrived PA alert
    activePAAlerts.forEach((a) => {
      if (!playedIds.current.has(a.id)) {
        playSpeech(a.message, a.id);
      }
    });

    // Handle voice list loading on some browsers
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const handleVoicesChanged = () => {
        activePAAlerts.forEach((a) => {
          if (!playedIds.current.has(a.id)) {
            playSpeech(a.message, a.id);
          }
        });
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, [activePAAlerts]);

  // If the user clicks anywhere on screen and TTS is blocked, try playing it
  useEffect(() => {
    if (!isSpeechBlocked || !activeAlert) return;

    const handleUserInteraction = () => {
      if (isSpeechBlocked && activeAlert) {
        playSpeech(activeAlert.message, activeAlert.id);
      }
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [isSpeechBlocked, activeAlert]);

  if (!activeAlert) return null;

  const announcementText = activeAlert.message.replace(/^PA_BROADCAST:\s*/, '');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="fixed top-4 left-4 right-4 z-[9999] max-w-xl mx-auto"
      >
        <div className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-slate-950/90 p-4 shadow-[0_8px_32px_rgba(239,68,68,0.3)] backdrop-blur-md animate-pulse-subtle">
          {/* Pulsing red/orange gradient bar at the bottom/top for warning */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />
          
          <div className="flex items-start gap-4">
            {/* Flashing Megaphone Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-red-500 text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                volume_up
              </span>
            </div>

            {/* Announcement Message */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black tracking-wider text-red-400 uppercase">Emergency PA Broadcast</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              </div>
              <h4 className="text-sm font-semibold text-slate-100 leading-snug break-words">
                {announcementText}
              </h4>
              
              {isSpeechBlocked && (
                <button
                  onClick={() => playSpeech(activeAlert.message, activeAlert.id)}
                  className="mt-3 flex items-center gap-1.5 bg-red-500/25 border border-red-500/40 hover:bg-red-500/45 px-3 py-1 rounded-full text-xs font-bold text-red-300 transition-colors animate-bounce"
                >
                  <span className="material-symbols-outlined text-sm">volume_up</span>
                  Click to Play Voice Announcement
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                onClick={() => setDismissedIds((prev) => [...prev, activeAlert.id])}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
                title="Dismiss Broadcast"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
