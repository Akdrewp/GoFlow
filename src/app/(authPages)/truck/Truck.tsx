import { getAssignmentFromUser, getProductFromOrg, getReportsForAssignment, getUser } from "@/api/firebase/firebaseService";
import { isValidUserToken } from "@/api/firebase/firebaseVerify";
import { withServerAuth } from "@/app/lib/server-auth";
import { TruckAssignmentClient } from "./TruckAssignment";
import { getLoadoutsForOrg, getTrucksForOrg } from "@/app/lib/datafetching";

const getTruckData = async (token: string) => {

  // Get User Profile
  const decodedToken = await isValidUserToken(token);
  const userId = decodedToken.uid;
  const userProfile = await getUser(token, userId);

  if (userProfile.type == "organization") {
    const organizationId = userProfile.organizationId;

    // Get requisite truck component data
    const trucks = await getTrucksForOrg(token, organizationId);
    const userAssignment = await getAssignmentFromUser(token, organizationId, userId);
    const availableLoadouts = await getLoadoutsForOrg(token, organizationId);

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