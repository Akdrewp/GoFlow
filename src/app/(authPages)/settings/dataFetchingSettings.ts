import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { getOrganization, getRolesForOrg, getUser } from "@/api/firebase/firebaseService";

import { Organization } from "@/api/database/database";
import { getLoadoutsForOrg, getCalibrationChartsForOrg, getProductsForOrg } from "@/app/lib/datafetching";
import { OrgSettingsData } from "./settingsOptions/OrganizationSettings";

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
    const userInfo = await getUser(token, userUid);

    // If user is part of organization get organization info
    if(userInfo.type == "organization") {
      const organizationResourceId = `organizations/${userInfo.organizationId}`;
      const organizationDocumentData = await getDataForResource(token, organizationResourceId);

      // Cast data to organization interface and return
      const organizationData = organizationDocumentData as Organization;
      return organizationData;

    } else { // If user is not part of an organization
      // Return null
      return null;
    }
  } catch(e) {
    console.log("getOrganizationSettingsData Error: ", e);
    throw(e);
  }
};

/**
 * 
 * @todo Refactor returning null and nesting
 */
// Used for fetching requisite organization settings
// Token already validated by withServerAuth
export const getOrganizationSettingsData = async (token: string): Promise<OrgSettingsData | null> => {

  try {
    // Get userInfo
    const userDecodedIdToken = await isValidUserToken(token);
    const userUid = userDecodedIdToken.uid;
    const userInfo = await getUser(token, userUid);

    // If user is part of organization get organization info
    if(userInfo.type=="organization") {
      // Get organization, roles, and calibrationCharts
      const organizationData = await getOrganization(token, userInfo.organizationId);
      const rolesData = await getRolesForOrg(token, userInfo.organizationId);
      const calibrationCharts = await getCalibrationChartsForOrg(token, userInfo.organizationId);
      const products = await getProductsForOrg(token, userInfo.organizationId);
      const loadouts = await getLoadoutsForOrg(token, userInfo.organizationId);

      return {
        organization: organizationData,
        roles: rolesData,
        charts: calibrationCharts,
        userEmployeeId: userInfo.employeeId,
        products: products,
        loadouts: loadouts
      };

    } else { // If user is not part of an organization
      // Return null
      return null;
    }
  } catch(e) {
    console.log("getOrganizationSettingsData Error: ", e);
    throw(e);
  }
};