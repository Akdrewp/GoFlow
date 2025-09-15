'use client';

import { useState, useEffect } from 'react';
import { DocumentData } from 'firebase/firestore';

// Assuming these are in the correct path
import { GeneralSettings } from '@/app/(authPages)/settings/settingsOptions/GeneralSettings';
import { OrganizationSettings, OrgSettingsData } from '@/app/(authPages)/settings/settingsOptions/OrganizationSettings';


interface SettingsData {
  generalData: DocumentData | null;
  organizationData: OrgSettingsData | null;
}

export default function SettingsView({ settingsData }: { settingsData: SettingsData }) {

  //Console log for settingData
  useEffect(() => {
    console.log('SettingsView received structured data:', settingsData);
  }, [settingsData]);

  // activeTab name
  const [activeTab, setActiveTab] = useState(GeneralSettings.name);

  const navItems = [GeneralSettings, OrganizationSettings];

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case GeneralSettings.name:
        return <GeneralSettings.component data={settingsData.generalData} />;   
      case OrganizationSettings.name:
        return <OrganizationSettings.component data={settingsData.organizationData} />;
      default:
        // Return generalSettings when there is no active tab
        // Although this shouldn't happen
        return <GeneralSettings.component data={settingsData.generalData} />;
    }
  };

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
                  onClick={() => setActiveTab(item.name)}
                  className={`inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50
                    ${
                      activeTab === item.name
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
            {/* Call the helper function to render the active tab's content */}
            {renderActiveTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

