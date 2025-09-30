// --- Assignment Service Functions ---

import { Assignment } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError, isValidUserToken } from "../firebaseVerify";
import { assignmentDatabase, truckDatabase } from "../firestoreDatabase";

/**
 * Adds a truck assignment document to the provided organization with
 * specified chartData.
 * Changes specified truck's assignedUserId to passed uid
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization to add the chart to.
 * @param assignmentData The data for the new assignment
 * @returns A promise that resolves to the assignment with assignmentId 
 *          when the assignment is successfully created.
 * @throws {FirebaseVerifyError} If the user is not authorized or, the chartId already exists, or the
 * truck attempted to assign to already has an existing active assignment
 */
export async function addAssignmentToOrg(token: string, organizationId: string, assignmentData: Omit<Assignment, "assignmentId" | "assignedAt" | "unassignedAt" >): 
                      Promise<Assignment> {
  /**
   * assignmentId is omitted because
   * firestore database will automatically generate a documentId used as the assignmentId.
   * 
   * assignedAt is omitted since it is defined here with new date
   * 
   * unassignedAt is omitted because it is defined here as null
   */
  try {

    // User can create if they have permissions to assignment
    // OR
    // User is assigning a truck to themselves

    // Check if user is trying to assign another user
    const decodedUserToken = await isValidUserToken(token);
    const selfAssign = decodedUserToken.uid == assignmentData.userId;
    if (!selfAssign) {
      // Verify user has permission to WRITE to the assignments collection.
      const resourcePath = `organizations/${organizationId}/assignments`;
      await canUserAccessData(token, resourcePath, AccessType.WRITE);
    }

    // Check if the truck attempting to assign is already assigned
    const truckHasActiveAssignment = await assignmentDatabase.isTruckCurrentlyAssigned(organizationId, assignmentData.truckId);
    if(truckHasActiveAssignment) {
      throw new FirebaseVerifyError(
        `Truck with ID "${assignmentData.truckId}" already assigned`,
        409 // Conflict
      );
    }

    // Create completed assigned at with "assignedAt" field
    // equal to the current date
    const completeAssignmentData = {
      ...assignmentData,
      assignedAt: new Date(),
      unassignedAt: null,
    };

    // Add assignment to database
    const truckAssignment = await assignmentDatabase.add(organizationId, completeAssignmentData);

    // Update truck's assignedUserId
    await truckDatabase.update(organizationId, completeAssignmentData.truckId, { assignedUserId: assignmentData.userId });

    // Return assignment
    return await truckAssignment;

  } catch (e) {
    console.error("Error in addAssignment service:", e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Handles the business logic for updating an assignment record.
 * This is primarily for administrative corrections.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param assignmentId The ID of the assignment to update.
 * @param assignmentData The data to update.
 * @returns A promise that resolves when the update is complete.
 * @throws {FirebaseVerifyError} If the user is not authorized or the assignment doesn't exist.
 */
export async function updateAssignmentInOrg(token: string, organizationId: string, assignmentId: string, assignmentData: Partial<Assignment>): Promise<void> {
  try {
    // User can create if they have permissions to assignment
    // OR
    // User is assigning a truck to themselves

    // Check if user is trying to access their own assignment
    const selfAssign = await userCanAccessAssignment(token, organizationId, assignmentId);
    if (!selfAssign) {
      // Verify user has permission to WRITE to the assignments collection.
      const resourcePath = `organizations/${organizationId}/assignments`;
      await canUserAccessData(token, resourcePath, AccessType.WRITE);
    }

    // Check if the assignment doesn't exist
    if (!(await assignmentDatabase.exists(organizationId, assignmentId))) {
      throw new FirebaseVerifyError(`Assignment with ID "${assignmentId}" not found.`, 404);
    }

    console.log("updateAssignInOrg CONSOLE LOG assignmentData: ", assignmentData);

    // Check if Assignment is ended
    if (assignmentData.unassignedAt) {
      // Get current assignment
      const currentAssigment = await assignmentDatabase.get(organizationId, assignmentId);

      // Check if it exists
      if (!currentAssigment) {
        throw new FirebaseVerifyError(
          `Assignment with ID "${assignmentId}" not found.`, 
          404 // Not Found
        );
      }

      // Remove assignedUserId from truck in datebase
      await truckDatabase.update(organizationId, currentAssigment.truckId, { assignedUserId: null });

    }

    await assignmentDatabase.update(organizationId, assignmentId, assignmentData);

  } catch (e) {
    console.error("Error in updateAssignmentInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for ending a user's currently active assignment (unassigning).
 * A subset of updateAssignmentInOrg but used enough to be defined
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param assignmentId The ID of the assignment to end.
 * @returns A promise that resolves when the assignment is successfully ended.
 * @throws {FirebaseVerifyError} If the user is not authorized or the assignment does not exists
 */
export async function endAssignmentInOrg(token: string, organizationId: string, assignmentId: string): Promise<void> {
  try {
    const endedAssignment = {
      unassignedAt: new Date(),
    };

    // Get current assignment
    const currentAssigment = await assignmentDatabase.get(organizationId, assignmentId);

    // Check if it exists
    if (!currentAssigment) {
      throw new FirebaseVerifyError(
        `Assignment with ID "${assignmentId}" not found.`, 
        404 // Not Found
      );
    } 

    // Remove assignedUserId from truck in datebase
    await truckDatabase.update(organizationId, currentAssigment.truckId, { assignedUserId: null });

    // Update Assignment in database
    await updateAssignmentInOrg(token, organizationId, assignmentId, endedAssignment);
  } catch (e) {
    console.error("Error in endAssignmentInOrg service:", e);
    throw e;
  }
}


/**
 * Handles the business logic for deleting an assignment record.
 * Used for fixing user error when intialy assigning trucks
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param assignmentId The ID of the assignment to delete.
 * @returns A promise that resolves when the assignment is successfully deleted.
 * @throws {FirebaseVerifyError} If the user is not authorized or the assignment doesn't exist.
 */
export async function deleteAssignmentFromOrg(token: string, organizationId: string, assignmentId: string): Promise<void> {
  try {
    // User can create if they have permissions to assignments
    // OR
    // User is assigning a truck to themselves

    // Check if user is trying to access their own assignment
    const selfAssign = await userCanAccessAssignment(token, organizationId, assignmentId);
    if (!selfAssign) {
      // Verify user has permission to WRITE to the assignments collection.
      const resourcePath = `organizations/${organizationId}/assignments`;
      await canUserAccessData(token, resourcePath, AccessType.WRITE);
    }

    // Get current assignment
    const currentAssigment = await assignmentDatabase.get(organizationId, assignmentId);

    // Check if it exists
    if (!currentAssigment) {
      throw new FirebaseVerifyError(
        `Assignment with ID "${assignmentId}" not found.`, 
        404 // Not Found
      );
    } 

    // Remove assignedUserId from truck in datebase
    await truckDatabase.update(organizationId, currentAssigment.truckId, { assignedUserId: null });

    // Remove assignment from database
    await assignmentDatabase.remove(organizationId, assignmentId);
  } catch (e) {
    console.error("Error in deleteAssignmentFromOrg service:", e);
    throw e;
  }
}

/**
 * Checks if a user is trying to assign a truck to themselves.
 * Neccessary for circumventing canUserAccessData for employeess
 * which is ran if this is false
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization.
 * @param assignmentId The ID of the assignment to check.
 * @returns A promise that resolves to true if the user is the owner, false otherwise.
 * @throws An error if the token is invalid or the assignment does not exist.
 */
async function userCanAccessAssignment(token: string, organizationId: string, assignmentId: string): Promise<boolean> {
  try {
    // Authenticate the user making the request.
    const decodedToken = await isValidUserToken(token);
    const requestorUid = decodedToken.uid;

    // Fetch the assignment document from the database.
    const assignment = await assignmentDatabase.get(organizationId, assignmentId);

    // If the assignment doesn't exist, access is denied.
    if (!assignment) {
      throw new FirebaseVerifyError(
        "Passed assignment does not exist",
        400 // Bad request
      );
    }

    // return if the requestorUid is equal to the assignment uid
    return requestorUid === assignment.userId;

  } catch (e) {
    console.error("Error in userCanAccessAssignment:", e);

    throw e;
  }
}