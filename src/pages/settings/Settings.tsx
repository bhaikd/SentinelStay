import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'security', label: 'Security', icon: 'security' },
    { id: 'emergency', label: 'Emergency Contacts', icon: 'contact_emergency' },
  ];

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">Settings</h1>
        <p className="text-sm text-on-surface-variant mt-1">Configure application preferences</p>
      </div>

      <div className="flex-1 flex bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-outline-variant/10 bg-surface-container-lowest flex flex-col p-4 shrink-0">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'general' && (
              <div className="space-y-8 max-w-2xl">
                <div>
                  <h2 className="text-lg font-bold text-on-surface mb-4">System Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                      <div>
                        <p className="font-semibold text-on-surface text-sm">Theme</p>
                        <p className="text-xs text-on-surface-variant">Switch between Light and Dark mode</p>
                      </div>
                      <select 
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="bg-surface-container-highest border-none cursor-pointer rounded-lg text-sm px-3 py-2 text-on-surface outline-none transition-colors hover:bg-surface-variant">
                        <option value="dark" className="bg-surface-container-highest text-on-surface">Dark Mode (Default)</option>
                        <option value="light" className="bg-surface-container-highest text-on-surface">Light Mode</option>
                        <option value="system" className="bg-surface-container-highest text-on-surface">System Default</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                      <div>
                        <p className="font-semibold text-on-surface text-sm">Language</p>
                        <p className="text-xs text-on-surface-variant">Select the default application language</p>
                      </div>
                      <select className="bg-surface-container-highest border-none rounded-lg text-sm px-3 py-2 text-on-surface outline-none">
                        <option className="bg-surface-container-highest text-on-surface">English (US)</option>
                        <option className="bg-surface-container-highest text-on-surface">Spanish (ES)</option>
                        <option className="bg-surface-container-highest text-on-surface">French (FR)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-8 max-w-2xl">
                <div>
                  <h2 className="text-lg font-bold text-on-surface mb-4">Alert Preferences</h2>
                  <div className="space-y-4">
                    {[
                      { title: 'Critical Incident Alerts', desc: 'Push notifications for Level 3 and 4 incidents', defaultOn: true },
                      { title: 'New Staff Deployments', desc: 'Notify when staff units are dispatched', defaultOn: true },
                      { title: 'Guest SOS Signals', desc: 'Immediate alert on guest emergency trigger', defaultOn: true },
                      { title: 'System Updates', desc: 'Receive maintenance and platform update notices', defaultOn: false },
                    ].map((pref, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                        <div>
                          <p className="font-semibold text-on-surface text-sm">{pref.title}</p>
                          <p className="text-xs text-on-surface-variant">{pref.desc}</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${pref.defaultOn ? 'bg-primary' : 'bg-surface-variant'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${pref.defaultOn ? 'left-5' : 'left-0.5'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 max-w-2xl">
                <div>
                  <h2 className="text-lg font-bold text-on-surface mb-4">Account Security</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-surface-container-low rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-on-surface text-sm">Two-Factor Authentication (2FA)</p>
                        <p className="text-xs text-on-surface-variant">Currently enabled via Authenticator App</p>
                      </div>
                      <button className="px-4 py-2 border border-outline-variant/30 text-sm font-semibold rounded-lg hover:bg-surface-variant transition-colors text-on-surface">
                        Manage
                      </button>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-on-surface text-sm">Password</p>
                        <p className="text-xs text-on-surface-variant">Last changed 45 days ago</p>
                      </div>
                      <button className="px-4 py-2 border border-outline-variant/30 text-sm font-semibold rounded-lg hover:bg-surface-variant transition-colors text-on-surface">
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'emergency' && (
              <div className="space-y-8 max-w-2xl">
                <div>
                  <h2 className="text-lg font-bold text-on-surface mb-4">Standard Operating Contacts</h2>
                  <p className="text-sm text-on-surface-variant mb-4">These contacts are used automatically during automated dispatch workflows.</p>
                  
                  <div className="space-y-4">
                    <div className="p-4 border border-outline-variant/20 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-on-surface">Local Police Department</h4>
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">PRIMARY</span>
                      </div>
                      <p className="text-sm text-on-surface-variant mb-1">Precinct 42 Dispatch</p>
                      <p className="text-sm font-mono text-on-surface">+1 (555) 911-0001</p>
                    </div>

                    <div className="p-4 border border-outline-variant/20 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-on-surface">City Fire Department</h4>
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">PRIMARY</span>
                      </div>
                      <p className="text-sm text-on-surface-variant mb-1">Station 7 Commander</p>
                      <p className="text-sm font-mono text-on-surface">+1 (555) 911-0002</p>
                    </div>
                    
                    <button className="w-full py-3 border-2 border-dashed border-outline-variant/30 rounded-xl text-primary font-semibold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">add</span>
                      Add Emergency Contact
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
