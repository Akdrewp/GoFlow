"server only";

import { cookies } from 'next/headers';
import Settings from "./Settings"; // Your client component for the UI
import { getDataForResource } from "@/api/firebase/firebaseVerify";

export default async function SettingsPage() {
  // 1. Read the token from the secure cookie.
  const userCookies = await cookies();
  const token = userCookies.get('session-token')?.value;

  let settingsData = null;
  let error = null;

  if (token) {
    // 2. Fetch data using the token.
    const result = await getDataForResource(token, "SettingsResource");
    if (result.success) {
      settingsData = result.data;
    } else {
      error = result.error;
    }
  } else {
    error = "Authentication required. Please log in.";
  }

  // 3. Render the UI, passing the data (or an error) to the client component.
  if (error) {
    return <div className="text-center p-10 text-destructive">{error}</div>;
  }

  return <Settings data={settingsData as string} />;
}
