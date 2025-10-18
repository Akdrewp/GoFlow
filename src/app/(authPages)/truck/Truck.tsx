import { Assignment, Loadout, Truck as TruckType } from "@/api/database/database"; // Conflicts with Truck tsx element
import { getAssignmentFromUser, getProductFromOrg, getReportsForAssignment, getUser } from "@/api/firebase/firebaseService";
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

const getAssignmentForUser = async (token: string, organizationId: string, uid: string): Promise<Assignment | undefined> => {
  try {

    return await getAssignmentFromUser(token, organizationId, uid);

  } catch (e) {
    console.error("Error fetching user's assignment: ", e);
    // Re-throw the error or return null depending on desired behavior for the caller
    throw e; 
  }
};

// Simple getter function for loadouts
const getLoadouts = async (token: string, organizationId: string): Promise<Loadout[]> => {
  try {
    const loadoutsCollectionId = `organizations/${organizationId}/loadouts`;
    const loadouts = await getDataForResource(token, loadoutsCollectionId);

    return loadouts as Loadout[];
  } catch (e) {
    console.error("Error fetching calibration charts: ", e);
    throw(e);
  }
};

const getTruckData = async (token: string) => {

  // Get User Profile
  const decodedToken = await isValidUserToken(token);
  const userId = decodedToken.uid;
  const userProfile = await getUser(token, userId);

  if (userProfile.type == "organization") {
    const organizationId = userProfile.organizationId;

    // Get requisite truck component data
    const trucks = await getTrucksForOrganization(token, organizationId);
    const userAssignment = await getAssignmentForUser(token, organizationId, userId);
    const availableLoadouts = await getLoadouts(token, organizationId);

    // If assigned to truck then get data
    let loadoutDetails;
    let pastReports;
    if (userAssignment) {
      const currentLoadout = availableLoadouts.find((loadout) => { return loadout.loadoutId == userAssignment.loadoutId; });
      if (!currentLoadout) {
        throw new Error("Assigned loadout not found");
      }

      // Get products in current assignment
      const assignmentProducts = await Promise.all(
        currentLoadout.productIds.map(productId =>
          getProductFromOrg(token, organizationId, productId)
        )
      );

      loadoutDetails = {
        ...currentLoadout,
        products: assignmentProducts,
      };

      /**
       * @todo Change the way this is got or the calibrationReport component
       */
      const reportsForAllProducts = await Promise.all(
        assignmentProducts.map(product =>
          getReportsForAssignment(
            token,
            organizationId,
            userAssignment.assignmentId,
            product.productId
          )
        )
      );

      // The result of Promise.all will be an array of arrays (e.g., [[reports for productA], [reports for productB]]).
      // We can use .flat() to merge them into a single, sorted list of all reports.
      pastReports = reportsForAllProducts.flat().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
    }

    const truckAssignmentData = {
      initialTrucks: trucks,
      availableLoadouts: availableLoadouts,
      loadoutDetails: loadoutDetails,
      pastReports: pastReports
    };

    return truckAssignmentData;
  } else {
    throw new Error("User is not part of an organization");
  }


};

export async function Truck() {

  const truckAssignmentData = await withServerAuth(async (token) => {
    return await getTruckData(token);
  });

  return (
  <div>
    <TruckAssignmentClient truckAssignmentData={JSON.parse(JSON.stringify(truckAssignmentData))} />
  </div>
  );
}