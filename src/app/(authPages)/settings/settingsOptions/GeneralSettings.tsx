import { DocumentData } from "firebase/firestore";

function GeneralSettingsElement({ data }: { data: DocumentData | null }) {

    console.log("Organization form settings", data);

    return (
              <div className="p-6 rounded-lg border bg-card text-card-foreground">
                <h2 className="text-xl font-semibold">General Settings</h2>
                <p className="text-muted-foreground mt-2">Content for General settings will be displayed here.</p>
              </div>
  );
}

export const GeneralSettings = {
  name: 'General',
  component: GeneralSettingsElement,
};