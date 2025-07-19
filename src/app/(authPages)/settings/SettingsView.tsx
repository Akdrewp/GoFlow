"use client";

import { useState } from 'react';
import { useEffect } from 'react';

import { GeneralSettings } from '@/app/(authPages)/settings/settingsOptions/GeneralSettings';
import { OrganizationSettings } from '@/app/(authPages)/settings/settingsOptions/OrganizationSettings';

export default function SettingsView({ data }: { data: string }) {

  useEffect(() => {
    console.log('Settings page received data:', data);
  }, [data]);

  const [activeTab, setActiveTab] = useState(GeneralSettings.element);

  const navItems = [GeneralSettings, OrganizationSettings];

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
                  key={item.name}
                  onClick={() => setActiveTab(item.element)}
                  className={`inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50
                    ${
                      activeTab === item.element
                        ? 'bg-muted text-foreground'
                        : 'hover:bg-muted/50 hover:text-foreground text-muted-foreground'
                    }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </aside>
          <div className="flex-1 lg:max-w-4xl">
            {activeTab}
          </div>
        </div>
      </div>
    </div>
  );
}
