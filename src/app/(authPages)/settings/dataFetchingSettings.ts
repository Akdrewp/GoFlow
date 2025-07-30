import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { firebaseDatabase } from "@/api/firebase/firestoreDatabase";

import { Organization } from "@/api/database/database";

/**
 * 
 * @todo Complete properly. Copy of getOrganizationSettings to allow testing
 */
// Used for fetching requisite organization settings
// Token already validated by withServerAuth
export const getGeneralSettingsData = async (token: string): Promise<Organization | null> => {

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

/**
 * 
 * @todo Refactor returning null and nesting
 */
// Used for fetching requisite organization settings
// Token already validated by withServerAuth
export const getOrganizationSettingsData = async (token: string): Promise<Organization | null> => {

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
    throw(e);
  }
};