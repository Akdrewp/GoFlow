import { Assignment, Employee, Truck } from "@/api/database/database";
import { AssignClient, DisplayTruck } from "./AssignmentView";
import { getDataForResource, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { withServerAuth } from "@/app/lib/server-auth";
import { getUser } from "@/api/firebase/firebaseService";

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

const getAssignmentsForOrganization = async (token: string, organizationId: string): Promise<Assignment[]> => {
  try {

    // Get assignments
    const assignmentsCollectionId = `organizations/${organizationId}/assignments`;
    const assignmentsData = await getDataForResource(token, assignmentsCollectionId);

    /**
     * @todo Change getDataForResource to return proper type rather than Documents
     * Maybe make it generic
     */
    // Hopeful casting
    return assignmentsData as Assignment[];

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

        // Hopeful casting
        return employees as Employee[];
    } catch (e) {
        console.error("Error fetching employees:", e);
        throw(e);
    }
};

export async function Assign() {

  const assignmentData = await withServerAuth(async (token) => {
    // Get decodedId token
    const decodedToken = await isValidUserToken(token);
    const userId = decodedToken.uid;

    // Get userProfile of organizationId
    const userProfile = await getUser(token, userId);

    if (!(userProfile.type == "organization")) {
      /**
       * @todo Change to some error handling based on unauthorized user
       * trying to access locked resource
       */
      throw new Error("Must be part of an organization to access data");
    }

    const assignments = await getAssignmentsForOrganization(token, userProfile.organizationId);

    // Get employees to pair employee object to a truck
    const employees = await getEmployeesForOrganization(token, userProfile.organizationId);
    const employeeMap = new Map(employees.map(emp => [emp.uid, emp.name]));

    const trucks = await  getTrucksForOrganization(token, userProfile.organizationId);

    // Create displayTrucks
    // Find each truck and add assignedUserName and assignmentId to each
    const displayTrucks: DisplayTruck[] = trucks.map(truck => {
      // If the truck isn't assigned just return the truck
      if (!truck.assignedUserId) {
        return truck;
      }

      // Get the assignment for the truck
      const assignment = assignments.find(a => a.truckId === truck.truckId);

      // Check if there is no assignment
      // OR
      // Check if the assignment has been unassigned
      //
      // This shouldn't happen since the truck has
      // an assigned user defined but check anyway
      if (!assignment || assignment.unassignedAt) {
        return truck;
      }

      return { 
        ...truck, 
        assignedUserName: employeeMap.get(assignment.userId),
        assignmentId: assignment?.assignmentId,
      };
    });

    return { initialTrucks: displayTrucks, allEmployees: employees, organizationId: userProfile.organizationId };
  });

  return <AssignClient assignmentData={assignmentData} />;
}