"server only";

import SettingsView from "./SettingsView";

import { withServerAuth } from "@/app/lib/server-auth";
import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { firebaseDatabase } from "@/api/firebase/firestoreDatabase";

import { Organization } from "@/api/database/database";

// Used for fetching requisite organization settings
// Token already validated by withServerAuth
const getOrganizationSettingsData = async (token: string): Promise<Organization | null> => {

  try {
    // Get userInfo
    const userDecodedIdToken = await isValidUserToken(token);
    const userUid = userDecodedIdToken.uid;
    const userInfo = await firebaseDatabase.user.get(userUid);

    // If user is part of organization get organization info
    if(userInfo?.organizationId && userInfo?.employeeId) {
      const organizationResourceId = `/organizations/${userInfo.organizationId}`;
      const organizationDocumentData = await getDataForResource(token, organizationResourceId);

      // Data should be defined since it was success but check for typescript
      if (organizationDocumentData.success && organizationDocumentData?.data) {
        
        // Cast data to organization interface and return
        const organizationData = organizationDocumentData.data as Organization;
        return organizationData;

      } else { //organizationData.success is false
        //Some reason the query went wrong
        throw(new Error(organizationDocumentData.error as string));
      }
    } else { // If user is not part of an organization
      // Return null
      return null;
    }
  } catch(e) {
    console.log("getOrganizationSettingsData Error: ", e);
    return null;
  }
};

export default async function Settings() {

  const result = await withServerAuth((token) => {
    return getOrganizationSettingsData(token);
  });

  // 3. Render the UI, passing the data (or an error) to the client component.
  if (!result) {
    return <div className="text-center p-10 text-destructive">Error fetching organization data</div>;
  }

  return (
    //Use as string for now to get rid of type error
    <SettingsView data={result.data as string}/>
  );
}
