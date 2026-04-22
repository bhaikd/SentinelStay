import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function GuestLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
          <span className="text-lg font-bold tracking-tight text-white">SentinelStay</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-blue-300">
          <span className="material-symbols-outlined text-sm">lock</span>
          Secure Connection
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-blue-400/50">
        SentinelStay Emergency Response System • Your safety is our priority
      </footer>
    </div>
  );
}
