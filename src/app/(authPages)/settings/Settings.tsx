"use client";

import { useState } from 'react';
import { useEffect } from 'react';

export default function Settings({ data }: { data: string }) {

  useEffect(() => {
    console.log('Settings page received data:', data);
  }, [data]);

  const [activeTab, setActiveTab] = useState('General');

  const navItems = ['General', 'Organization'];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="space-y-6">
        <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-muted-foreground">Settings</h1>
            <p className="text-muted-foreground">
                Manage your account settings and preferences.
            </p>
        </div>
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="mx-4 lg:w-1/5">
            <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveTab(item)}
                  className={`inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50
                    ${
                      activeTab === item
                        ? 'bg-muted text-foreground'
                        : 'hover:bg-muted/50 hover:text-foreground text-muted-foreground'
                    }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>
          <div className="flex-1 lg:max-w-4xl">
            {activeTab === 'General' && (
              <div className="p-6 rounded-lg border bg-card text-card-foreground">
                <h2 className="text-xl font-semibold">General Settings</h2>
                <p className="text-muted-foreground mt-2">Content for General settings will be displayed here.</p>
              </div>
            )}
            {activeTab === 'Organization' && (
              <div className="p-6 rounded-lg border bg-card text-card-foreground">
                <h2 className="text-xl font-semibold">Organization Settings</h2>
                <p className="text-muted-foreground mt-2">Content for Organization settings will be displayed here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
