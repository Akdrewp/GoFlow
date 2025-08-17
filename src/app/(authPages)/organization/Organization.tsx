import { getDataForResource, isValidUserToken, userService } from "@/api/firebase/firebaseVerify";
import { withServerAuth } from "@/app/lib/server-auth";
//Change type to sidestep duplicate organization use
import { Organization as OrganizationType, Employee } from "@/api/database/database";
import { OrganizationDisplay } from "@/app/(authPages)/organization/OrganizationDisplay";

//Keep these imports together for now in case switching to seperate file
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/api/firebase/firebaseConfig";

/**
 * 
 * @todo Change this to use getDataForResource
 */
const getEmployeesForOrganization = async (organizationId: string): Promise<Employee[] | null> => {
    try {
        const employeesRef = collection(db, `organizations/${organizationId}/employees`);
        const querySnapshot = await getDocs(employeesRef);
        
        if (querySnapshot.empty) {
            return [];
        }

        console.log("Organization.tsx getEmployeesForOrganization CONSOLE LOG:");
        querySnapshot.docs.forEach((doc, index) => {
            console.log(`  Employee ${index + 1}:`, doc.data());
        });

        const employees = querySnapshot.docs.map(doc => doc.data() as Employee);
        return employees;
    } catch (e) {
        console.error("Error fetching employees:", e);
        return null;
    }
};

const getOrganizationInfo = async (token: string): Promise<OrganizationType | null> => {

  try {
    // Get userInfo
    const userDecodedIdToken = await isValidUserToken(token);
    const userUid = userDecodedIdToken.uid;
    const userInfo = await userService.get(token, userUid);

    // If user is part of organization get organization info
    if(userInfo?.organizationId && userInfo?.employeeId) {
      const organizationResourceId = `/organizations/${userInfo.organizationId}`;

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

  const OrganizationInfo = await withServerAuth(async (token) => {
    return await getOrganizationInfo(token);
  });

  //Cast to string just for testing purposes
  const employees = await getEmployeesForOrganization(OrganizationInfo?.organizationId as string);

  return (
    <div>
      {/** JSON parse and stringify is for converting to plain objects for NextJS */}
      <OrganizationDisplay info={JSON.parse(JSON.stringify(OrganizationInfo))} employees={JSON.parse(JSON.stringify(employees))}/> 
    </div>
  );
}