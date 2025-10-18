'use client';

import { useUser } from "@/app/lib/contexts/UserContext";

function GeneralSettingsElement() {
  // Get the user's data and loading state from the context.
  const { user } = useUser();


  // Handle the case where the user is not logged in or data couldn't be fetched.
  if (!user) {
    return (
      <div className="p-6 rounded-lg border bg-card text-card-foreground">
        <h2 className="text-xl font-semibold">General Settings</h2>
        <p className="text-muted-foreground mt-2">Could not load user profile. Please log in again.</p>
      </div>
    );
  }

  // If the user data is available, display it.
  return (
    <div className="p-6 rounded-lg border bg-card text-card-foreground">
      <h2 className="text-xl font-semibold mb-4">General Settings</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Name</h3>
          <p className="text-sm text-muted-foreground">{user.name}</p>
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">Email</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">User ID</h3>
          <p className="text-sm text-muted-foreground break-all">{user.uid}</p>
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">Account Type</h3>
          <p className="text-sm text-muted-foreground capitalize">{user.type}</p>
        </div>
      </div>
    </div>
  );
}

export const GeneralSettings = {
  name: 'General',
  component: GeneralSettingsElement,
};
