import { getAssignmentFromUser, getReportsForAssignment, getUser } from "@/api/firebase/firebaseService";
import { DashboardView } from "./DashboardView";
import { isValidUserToken } from "@/api/firebase/firebaseVerify";
import { withServerAuth } from "@/app/lib/server-auth";
import { getLoadoutFromOrg } from "@/api/firebase/firebaseService/loadoutService";
import { getTruckFromOrg } from "@/api/firebase/firebaseService/truckService";



export async function Dashboard() {

  const dashboardData = await withServerAuth(async (token) => {
    // Get userProfile
    const decodedToken = await isValidUserToken(token);
    const userId = decodedToken.uid;
    const userProfile = await getUser(token, userId);

    if (!(userProfile.type == "organization")) {
      throw new Error("Must be part of an organization to access data");
    }

    // Get the current assignment
    const userAssignment = await getAssignmentFromUser(token, userProfile.organizationId, userProfile.uid);
    if (!userAssignment) {
      return {
        reports: [], // Empty report array
        truck: undefined, // Undefined truck
      };
    } else {
      const assignmentLoadout = await getLoadoutFromOrg(token, userProfile.organizationId, userAssignment.loadoutId);

      const reportsForAllProducts = (await Promise.all(
        assignmentLoadout.productIds.map(productId => 
            getReportsForAssignment(token, userProfile.organizationId, userAssignment.assignmentId, productId)
        )
      )).flat();

      const assignedTruck = await getTruckFromOrg(token, userProfile.organizationId, userAssignment.truckId);

      return {
        reports: reportsForAllProducts,
        truck: assignedTruck,
      };
    }

  });


  return <DashboardView dashboardData={JSON.parse(JSON.stringify(dashboardData))}/>;
}