"server only";

import SettingsView from "./SettingsView";

import { withServerAuth } from "@/app/lib/server-auth";

import { getOrganizationSettingsData, getGeneralSettingsData } from "@/app/(authPages)/settings/dataFetchingSettings";


export default async function Settings() {

    // The withServerAuth wrapper handles token validation and errors.
  const settingsData = await withServerAuth(async (token) => {
      // Fetch data for all setting tabs concurrently.
      const [generalData, organizationData] = await Promise.all([
          getGeneralSettingsData(token),
          getOrganizationSettingsData(token)
      ]);

      // Assemble the data into a single object.
      return {
          generalData,
          organizationData,
      };
  });

  // 3. Render the UI, passing the data (or an error) to the client component.
  if (!settingsData) {
    return <div className="text-center p-10 text-destructive">Error fetching organization data</div>;
  }

  return (
    //Use as string for now to get rid of type error
    <SettingsView settingsData={JSON.parse(JSON.stringify(settingsData))}/>
  );
}
