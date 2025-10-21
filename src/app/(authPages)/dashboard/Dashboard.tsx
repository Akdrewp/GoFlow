import { getAssignmentFromUser, getReportsForAssignment, getUser } from "@/api/firebase/firebaseService";
import { DashboardView, NoOrganizationView } from "./DashboardView";
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

    // --- MODIFIED LOGIC ---
    // If the user is not part of an organization, return a specific flag.
    if (userProfile.type !== "organization") {
      return { userIsInOrg: false };
    }

    // Get the current assignment
    const userAssignment = await getAssignmentFromUser(token, userProfile.organizationId, userProfile.uid);
    if (!userAssignment) {
      return {
        userIsInOrg: true,
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
        userIsInOrg: true,
        reports: reportsForAllProducts,
        truck: assignedTruck,
      };
    }
  });

  // --- CONDITIONAL RENDERING ---
  // Check the flag from the server logic to decide which component to render.
  if (!dashboardData.userIsInOrg) {
    return <NoOrganizationView />;
  }

  return <DashboardView dashboardData={JSON.parse(JSON.stringify(dashboardData))}/>;
}