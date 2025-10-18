import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { getRolesForOrg, getUser } from "@/api/firebase/firebaseService"; 
import { withServerAuth } from "@/app/lib/server-auth";
//Change type to sidestep duplicate organization use
import { Organization as OrganizationType } from "@/api/database/database";
import { OrganizationDisplay } from "@/app/(authPages)/organization/OrganizationDisplay";
import { getCalibrationChartsForOrg, getEmployeesForOrg, getLoadoutsForOrg, getTrucksForOrg } from "@/app/lib/datafetching";

const getOrganizationInfo = async (token: string): Promise<OrganizationType | null> => {

  try {
    // Get userInfo
    const userDecodedIdToken = await isValidUserToken(token);
    const userUid = userDecodedIdToken.uid;
    const userInfo = await getUser(token, userUid);

    // If user is part of organization get organization info
    if(userInfo.type == "organization") {
      const organizationResourceId = `organizations/${userInfo.organizationId}`;

      // If user does not have access then this will throw an error
      const organizationDocumentData = await getDataForResource(token, organizationResourceId);
        
      // Safe to assume data is defined and fite schema
      const organizationData = organizationDocumentData as OrganizationType;
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

export default async function Organization() {

  const organizationData = await withServerAuth(async (token) => {
    
    // Get organizationId
    const organizationInfo = await getOrganizationInfo(token);
    if (!organizationInfo) {
      // If the user is not in an organization, there's no more data to fetch.
      return null;
    }
    const { organizationId } = organizationInfo;

    // Get resources in promises
    const [
      roles,
      employees,
      trucks,
      calibrationCharts,
      loadouts
    ] = await Promise.all([
      getRolesForOrg(token, organizationId),
      getEmployeesForOrg(token, organizationId),
      getTrucksForOrg(token, organizationId),
      getCalibrationChartsForOrg(token, organizationId),
      getLoadoutsForOrg(token, organizationId)
    ]);

    // Return a single, complete data object.
    return { organizationInfo, roles, employees, trucks, calibrationCharts, loadouts };
  });

  return (
    <div>
      {/** JSON parse and stringify is for converting to plain objects for NextJS */}
      <OrganizationDisplay data={JSON.parse(JSON.stringify(organizationData))}/> 
    </div>
  );
}