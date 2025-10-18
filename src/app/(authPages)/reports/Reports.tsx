import { getProductFromOrg, getReportsForAssignment, getUser } from "@/api/firebase/firebaseService";
import { getLoadoutFromOrg } from "@/api/firebase/firebaseService/loadoutService";
import { isValidUserToken } from "@/api/firebase/firebaseVerify";
import { withServerAuth } from "@/app/lib/server-auth";
import { ReportsClient, DisplayAssignment, DisplayReport } from "./ReportsView";
import { getActiveAssignmentsForOrg, getEmployeesForOrg, getTrucksForOrg } from "@/app/lib/datafetching";


export async function Reports() {

  const displayAssignments:  DisplayAssignment[] = await Promise.all(await withServerAuth(async (token) => {

    // Get User Profile
    const decodedToken = await isValidUserToken(token);
    const userId = decodedToken.uid;
    const userProfile = await getUser(token, userId);

    if (userProfile.type !== 'organization') {
      throw new Error("User must be part of an organization to view reports.");
    }
    const { organizationId } = userProfile;


    const [
      activeAssignments,
      allTrucks,
      allEmployees,
    ] = await Promise.all([
      getActiveAssignmentsForOrg(token, organizationId),
      getTrucksForOrg(token, organizationId),
      getEmployeesForOrg(token, organizationId),
    ]);

    const truckMap = new Map(allTrucks.map(t => [t.truckId, t.name]));
    const employeeMap = new Map(allEmployees.map(e => [e.uid, e.name]));

    const processedAssignments = activeAssignments.map(async (assignment) => {
      const assignmentLoadout = await getLoadoutFromOrg(token, organizationId, assignment.loadoutId);
      const productsInLoadout = await Promise.all(
        assignmentLoadout.productIds.map(async (productId) => {
          return await getProductFromOrg(token, organizationId, productId);
        })
      );

      // Get reports for the assignment
      const assignmentReports = await Promise.all(
        productsInLoadout.map(product =>
          getReportsForAssignment(
            token,
            organizationId,
            assignment.assignmentId,
            product.productId
          )
        )
      );

      // Turn into single array sorted by product
      const pastReports = assignmentReports.flat();

      console.log("pastReports: ",  pastReports);

      const productMap = new Map(productsInLoadout.map(product => [product.productId, product]));

      const processedReports: DisplayReport[] = pastReports.map(report => {
        // Get the product for the report from the map.
        const productForReport = productMap.get(report.productId);

        // Return the report, handling the case where the product might not be found.
        return {
          ...report,
          productName: productForReport?.name || 'Unknown Product',
          targetRate: productForReport?.targetRate || 0,
        };
      });

      return {
        ...assignment,
        employeeName: employeeMap.get(assignment.userId) || "Unkown Employee",
        truckName: truckMap.get(assignment.truckId) || "Unknown Truck",
        reports: processedReports,
      };

    });

    return processedAssignments;

  }));

  return <div>
    <ReportsClient initialAssignments={JSON.parse(JSON.stringify(displayAssignments))} />
  </div>;
}