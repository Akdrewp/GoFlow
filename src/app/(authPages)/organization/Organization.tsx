import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { firebaseDatabase } from "@/api/firebase/firestoreDatabase";
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
    const userInfo = await firebaseDatabase.user.get(userUid);

    // If user is part of organization get organization info
    if(userInfo?.organizationId && userInfo?.employeeId) {
      const organizationResourceId = `/organizations/${userInfo.organizationId}`;
      const organizationDocumentData = await getDataForResource(token, organizationResourceId);

      // Data should be defined since it was success but check for typescript
      if (organizationDocumentData.success && organizationDocumentData?.data) {
        
        // Cast data to organization interface and return
        const organizationData = organizationDocumentData.data as OrganizationType;
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