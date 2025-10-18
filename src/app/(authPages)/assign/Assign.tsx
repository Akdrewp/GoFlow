import { AssignClient, DisplayTruck } from "./AssignmentView";
import { isValidUserToken } from "@/api/firebase/firebaseVerify";
import { withServerAuth } from "@/app/lib/server-auth";
import { getUser } from "@/api/firebase/firebaseService";
import { getActiveAssignmentsForOrg, getEmployeesForOrg, getTrucksForOrg, getLoadoutsForOrg } from "@/app/lib/datafetching";

export async function Assign() {

  const assignmentData = await withServerAuth(async (token) => {
    // Get userProfile
    const decodedToken = await isValidUserToken(token);
    const userId = decodedToken.uid;
    const userProfile = await getUser(token, userId);

    if (!(userProfile.type == "organization")) {
      /**
       * @todo Change to some error handling based on unauthorized user
       * trying to access locked resource
       */
      throw new Error("Must be part of an organization to access data");
    }

    const assignments = await getActiveAssignmentsForOrg(token, userProfile.organizationId);

    // Get employees to pair employee object to a truck
    const employees = await getEmployeesForOrg(token, userProfile.organizationId);
    const employeeMap = new Map(employees.map(emp => [emp.uid, emp.name]));

    const trucks = await  getTrucksForOrg(token, userProfile.organizationId);

    const loadouts = await getLoadoutsForOrg(token, userProfile.organizationId);

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

    return { initialTrucks: displayTrucks, allEmployees: employees, organizationId: userProfile.organizationId, availableLoadouts: loadouts};
  });

  return <AssignClient assignmentData={assignmentData} />;
}