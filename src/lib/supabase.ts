import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  // Surface a clear, actionable error in the console without crashing the app shell.
  // Pages that depend on Supabase render their own friendly fallback UI.
  // eslint-disable-next-line no-console
  console.error(
    '[SentinelStay] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project credentials, then restart the dev server.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseKey || 'invalid-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
