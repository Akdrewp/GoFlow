"server only";

import SettingsView from "./SettingsView";

import { withServerAuth } from "@/app/lib/server-auth";
import { getDataForResource } from "@/api/firebase/firebaseVerify";

export default async function Settings() {

  const result = await withServerAuth((token) => {
    // This code only runs if the token exists and is valid.
    return getDataForResource(token, "SettingsResource");
  });

  // 3. Render the UI, passing the data (or an error) to the client component.
  if (result.error) {
    return <div className="text-center p-10 text-destructive">{result.error}</div>;
  }

  return (
    //Use as string for now to get rid of type error
    <SettingsView data={result.data as string}/>
  );
}
