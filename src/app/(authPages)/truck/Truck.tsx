import { Assignment, Truck as TruckType } from "@/api/database/database"; // Conflicts with Truck tsx element
import { getUser } from "@/api/firebase/firebaseService";
import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { withServerAuth } from "@/app/lib/server-auth";
import { TruckAssignmentClient } from "./TruckAssignment";

const getTrucksForOrganization = async (token: string, organizationId: string): Promise<TruckType[]> => {
  try {
    const trucksCollectionId = `organizations/${organizationId}/trucks`;
    const trucks = await getDataForResource(token, trucksCollectionId);

    return trucks as TruckType[];
  } catch (e) {
    console.error("Error fetching trucks: ", e);
    throw(e);
  }
};

const getAssignmentForUser = async (token: string, organizationId: string): Promise<Assignment | null> => {
  try {
    // Get decodedId token
    const decodedToken = await isValidUserToken(token);
    const userId = decodedToken.uid;

    // Get assignments
    const assignmentsCollectionId = `organizations/${organizationId}/assignments`;
    const assignmentsData = await getDataForResource(token, assignmentsCollectionId);


    // Find assignment where assigned userId is equal to users uid
    // AND
    // assignment is active
    const userAssignment = assignmentsData.find((doc: Assignment) => {
      return (doc.userId === userId) && (!doc.unassignedAt);
    });

    // Return assignment
    if (userAssignment) {
      return userAssignment as Assignment;
    } else {
      return null;
    }

  } catch (e) {
    console.error("Error fetching user's assignment: ", e);
    // Re-throw the error or return null depending on desired behavior for the caller
    throw e; 
  }
};

export async function Truck() {

  // Get user profile
  const userProfile = await withServerAuth(async (token) => {

    // Get decodedId token
    const decodedToken = await isValidUserToken(token);
    const userId = decodedToken.uid;

    return await getUser(token, userId);
  });

  if (userProfile.type != "organization") {
    throw new Error("User is not part of an organization");
  }

  const organizationId = userProfile.organizationId;

  const trucks = await withServerAuth(async (token) => {
    return await getTrucksForOrganization(token, organizationId);
  });

  const userAssignment = await withServerAuth(async (token) => {
    return await getAssignmentForUser(token, organizationId);
  });

  const truckAssignmentData = {
    initialTrucks: trucks,
    initialCurrentUserAssignment: userAssignment,
    currentUser: userProfile,
    organizationId: organizationId,
  };

  return (
  <div>
    <TruckAssignmentClient truckAssignmentData={JSON.parse(JSON.stringify(truckAssignmentData))} />
  </div>
  );
}