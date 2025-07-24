'use client';

import { useState, useEffect } from 'react';

// Assuming these are in the correct path
import { GeneralSettings } from '@/app/(authPages)/settings/settingsOptions/GeneralSettings';
import { OrganizationSettings } from '@/app/(authPages)/settings/settingsOptions/OrganizationSettings';

export default function SettingsView({ data }: { data: string }) {

  useEffect(() => {
    console.log('Settings page received data:', data);
  }, [data]);

  // Store the *name* of the active tab, not the element itself.
  const [activeTab, setActiveTab] = useState(GeneralSettings.name);

  const navItems = [GeneralSettings, OrganizationSettings];

  // Find the component to render based on the active tab's name.
  const ActiveComponent = navItems.find(item => item.name === activeTab)?.component;

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
                  onClick={() => setActiveTab(item.name)} // Set the active tab by name
                  className={`inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50
                    ${
                      activeTab === item.name // Compare names for active state
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
            {/* Render the active component and pass the data prop to it */}
            {ActiveComponent && <ActiveComponent data={data} />}
          </div>
        </div>
      </div>
    </div>
  );
}
