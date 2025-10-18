import { Assignment, Employee, Truck } from "@/api/database/database";
import { getProductFromOrg, getReportsForAssignment, getUser } from "@/api/firebase/firebaseService";
import { getLoadoutFromOrg } from "@/api/firebase/firebaseService/loadoutService";
import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { withServerAuth } from "@/app/lib/server-auth";
import { ReportsClient, DisplayAssignment, DisplayReport } from "./ReportsView";

const getTrucksForOrganization = async (token: string, organizationId: string): Promise<Truck[]> => {
  try {
    const trucksCollectionId = `organizations/${organizationId}/trucks`;
    const trucks = await getDataForResource(token, trucksCollectionId);

    return trucks as Truck[];
  } catch (e) {
    console.error("Error fetching trucks: ", e);
    throw(e);
  }
};

const getActiveAssignmentsForOrganization = async (token: string, organizationId: string): Promise<Assignment[]> => {
  try {

    // Get assignments
    const assignmentsCollectionId = `organizations/${organizationId}/assignments`;
    const assignmentsData = await getDataForResource(token, assignmentsCollectionId);

    // Get active assignment where unassigned is null
    const activeAssignments = assignmentsData.filter((assignment: Assignment) => {
      return assignment.unassignedAt === null;
    });

    /**
     * @todo Change getDataForResource to return proper type rather than Documents
     * Maybe make it generic
     */
    // Hopeful casting
    return activeAssignments as Assignment[];

  } catch (e) {
    console.error("Error fetching user's assignment: ", e);
    // Re-throw the error or return null depending on desired behavior for the caller
    throw e; 
  }
};

const getEmployeesForOrganization = async (token: string, organizationId: string): Promise<Employee[]> => {
    try {
        const employeesCollectionId = `organizations/${organizationId}/employees`;
        const employees = await getDataForResource(token, employeesCollectionId);

        // const employees = querySnapshot.docs.map(doc => doc.data() as Employee);
        return employees as Employee[];
    } catch (e) {
        console.error("Error fetching employees:", e);
        throw e;
    }
};



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
      getActiveAssignmentsForOrganization(token, organizationId),
      getTrucksForOrganization(token, organizationId),
      getEmployeesForOrganization(token, organizationId),
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