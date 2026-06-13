import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIncidentSummary, summaryInputFromIncident } from '../hooks/useIncidentSummary';
import type { Incident } from '../types';

type Props = {
  incident: Incident;
  missingGuests?: number;
  /** "compact" = small inline button suitable for cards. "full" = command-center style. */
  variant?: 'compact' | 'full';
};

export default function IncidentAISummary({ incident, missingGuests, variant = 'compact' }: Props) {
  const { summarize, summaryText, summaryError, isSummarizing } = useIncidentSummary();
  const [open, setOpen] = useState(variant === 'full');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
    summarize(summaryInputFromIncident(incident, { missingGuests }));
  };

  const showPanel = open && (summaryText || isSummarizing || summaryError);

  return (
    <div className={variant === 'full' ? 'mt-6 border-t border-outline-variant/10 pt-4' : 'mt-2'}>
      <button
        onClick={handleClick}
        disabled={isSummarizing}
        className={
          variant === 'full'
            ? 'w-full flex items-center justify-center gap-2 bg-primary-container text-on-primary-container py-2.5 rounded-lg font-semibold hover:bg-primary-container/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            : 'w-full flex items-center justify-center gap-1.5 bg-primary-container text-on-primary-container px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
        }
        aria-label="Summarize incident with AI"
      >
        <span
          className={variant === 'full' ? 'material-symbols-outlined text-[20px]' : 'material-symbols-outlined text-sm'}
        >
          auto_awesome
        </span>
        {isSummarizing ? 'Generating AI Summary…' : 'AI Summarize'}
        {isSummarizing && (
          <span className={`material-symbols-outlined animate-spin ${variant === 'full' ? 'text-[18px]' : 'text-xs'}`}>
            autorenew
          </span>
        )}
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {summaryError && (
              <div className="mt-3 text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg flex items-start gap-2 border border-red-500/20">
                <span className="material-symbols-outlined text-sm shrink-0">error</span>
                <span>{summaryError}</span>
              </div>
            )}

            {summaryText && (
              <div className="mt-3 bg-surface-container-lowest p-3 rounded-lg border border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-tertiary to-primary opacity-50" />
                <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                  {summaryText.replace(/\*\*/g, '').replace(/\*/g, '')}
                </p>
              </div>
            )}

            {!summaryText && isSummarizing && !summaryError && (
              <p className="mt-3 text-[11px] text-on-surface-variant italic">Streaming response…</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
