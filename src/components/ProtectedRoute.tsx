import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const handleSession = async (session: Session | null) => {
      if (!session) {
        if (active) {
          setSession(null);
          setRole(null);
          setLoading(false);
        }
        return;
      }

      if (active) {
        setSession(session);
      }

      // Fetch user's role
      if (session.user.id === 'mock-user-id') {
        if (active) {
          setRole('admin');
          setLoading(false);
        }
      } else {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (active) {
            if (data && !error) {
              setRole(data.role);
            } else {
              setRole('staff'); // Default fallback
            }
            setLoading(false);
          }
        } catch (e) {
          if (active) {
            setRole('staff');
            setLoading(false);
          }
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSession(session);
      } else {
        // Safe mock fallback for local developer testing
        const mockSession = {
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: 'mock-user-id',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: 'admin@sentinelstay.com',
          },
        } as any;
        handleSession(mockSession);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-blue-500">
        <span className="material-symbols-outlined animate-spin text-4xl" aria-label="Loading">autorenew</span>
      </div>
    );
  }

  if (!session) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce role-based access control
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const handleLogout = async () => {
      await supabase.auth.signOut();
      // Set session to null to trigger login redirect
      setSession(null);
    };

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden font-body">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-red-500/20 p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center relative z-10 font-sans">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 relative shadow-lg">
            <span className="material-symbols-outlined text-4xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_bad</span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight mb-2">Access Denied</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Your current account credentials do not grant access to this dashboard. Additional permissions are required.
          </p>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2 mb-8 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Identity:</span>
              <span className="text-slate-300 font-semibold">{session.user.email}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-slate-500">Current Role:</span>
              <span className="text-red-400 font-bold capitalize">{role}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-slate-500">Required Roles:</span>
              <span className="text-emerald-400 font-bold capitalize">{allowedRoles.join(' / ')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-white text-slate-950 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">home</span>
              Return to Home
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold py-3.5 px-4 rounded-xl active:scale-95 border border-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
