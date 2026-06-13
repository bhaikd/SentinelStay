import { useCallback, useState } from 'react';
import type { Incident } from '../types';

type SummaryInput = {
  title: string;
  description: string;
  /** Free-form context, e.g. `"3 guests affected, 1 missing."` */
  affectedSystems?: string;
  /** Newline-separated timeline lines, e.g. `"[10:42:01] Unit 3 dispatched"`. */
  timestamps?: string;
};

export function useIncidentSummary() {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSummaryText('');
    setSummaryError(null);
  }, []);

  const summarize = useCallback(async (input: SummaryInput) => {
    setIsSummarizing(true);
    setSummaryText('');
    setSummaryError(null);

    try {
      const response = await fetch('/api/summarize-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          affectedSystems: input.affectedSystems ?? '',
          timestamps: input.timestamps ?? '',
        }),
      });

      if (!response.ok) {
        let msg = `Server responded with status ${response.status}`;
        try {
          const err = await response.json();
          if (err?.error) msg = err.error;
        } catch {
          if (response.status === 504 || response.status === 502) {
            msg = 'API server is not running. Start it with `npm run dev`.';
          }
        }
        throw new Error(msg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream available');
      const decoder = new TextDecoder('utf-8');

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (!value) continue;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setSummaryError(parsed.error);
            } else if (parsed.text) {
              setSummaryText((prev) => prev + parsed.text);
            }
          } catch {
            // ignore partial chunk parse errors
          }
        }
      }
    } catch (err: any) {
      setSummaryError(err?.message || 'Failed to summarize incident.');
    } finally {
      setIsSummarizing(false);
    }
  }, []);

  return { summarize, summaryText, summaryError, isSummarizing, reset };
}

export function summaryInputFromIncident(
  incident: Incident,
  extras: { missingGuests?: number } = {},
): SummaryInput {
  const affected =
    `${incident.guestsAffected ?? 0} guests affected` +
    (typeof extras.missingGuests === 'number' ? `, ${extras.missingGuests} missing.` : '.');
  return {
    title: incident.title,
    description: incident.description ?? '',
    affectedSystems: affected,
    timestamps: (incident.timeline ?? [])
      .map((e) => `[${e.timestamp}] ${e.message}`)
      .join('\n'),
  };
}
