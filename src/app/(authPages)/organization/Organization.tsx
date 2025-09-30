import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { getRolesForOrg, getUser } from "@/api/firebase/firebaseService"; 
import { withServerAuth } from "@/app/lib/server-auth";
//Change type to sidestep duplicate organization use
import { Organization as OrganizationType, Employee, Truck, CalibrationChart } from "@/api/database/database";
import { OrganizationDisplay } from "@/app/(authPages)/organization/OrganizationDisplay";

const getEmployeesForOrganization = async (token: string, organizationId: string): Promise<Employee[] | null> => {
    try {
        const employeesCollectionId = `organizations/${organizationId}/employees`;
        const employees = await getDataForResource(token, employeesCollectionId);

        // const employees = querySnapshot.docs.map(doc => doc.data() as Employee);
        return employees as Employee[];
    } catch (e) {
        console.error("Error fetching employees:", e);
        return null;
    }
};

const getTrucksForOrganization = async (token: string, organizationId: string): Promise<Truck[] | null> => {
  try {
    const trucksCollectionId = `organizations/${organizationId}/trucks`;
    const trucks = await getDataForResource(token, trucksCollectionId);

    return trucks as Truck[];
  } catch (e) {
    console.error("Error fetching trucks: ", e);
    return null;
  }
};

// Simple getter function for calibration charts
const getCalibrationCharts = async (token: string, organizationId: string): Promise<CalibrationChart[]> => {
  try {
    const calibrationChartsCollectionId = `organizations/${organizationId}/calibrationCharts`;
    const calibrationCharts = await getDataForResource(token, calibrationChartsCollectionId);

    return calibrationCharts as CalibrationChart[];
  } catch (e) {
    console.error("Error fetching calibration charts: ", e);
    throw(e);
  }
}; 

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

  const organizationInfo = await withServerAuth(async (token) => {
    return await getOrganizationInfo(token);
  });

  const roles = await withServerAuth(async (token) => {
    return await getRolesForOrg(token, organizationInfo?.organizationId as string);
  });

  //Cast to string just for testing purposes
  const employees = await withServerAuth(async (token) => {
    return await getEmployeesForOrganization(token, organizationInfo?.organizationId as string);
  });

  // Change to getTrucksLater
  const trucks = await withServerAuth(async (token) => {
    return await getTrucksForOrganization(token, organizationInfo?.organizationId as string);
  });

  const calibrationCharts = await withServerAuth(async (token) => {
    return await getCalibrationCharts(token, organizationInfo?.organizationId as string);
  });

  const organizationData = {
    info: organizationInfo,
    employees: employees,
    calibrationCharts: calibrationCharts,
    roles: roles,
    trucks: trucks,
  };

  return (
    <div>
      {/** JSON parse and stringify is for converting to plain objects for NextJS */}
      <OrganizationDisplay data={JSON.parse(JSON.stringify(organizationData))}/> 
    </div>
  );
}