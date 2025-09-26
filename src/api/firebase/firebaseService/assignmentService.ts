// --- Assignment Service Functions ---

import { Assignment } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError } from "../firebaseVerify";
import { assignmentDatabase } from "../firestoreDatabase";

/**
 * Adds a truck assignment document to the provided organization with
 * specified chartData.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization to add the chart to.
 * @param assignmentData The data for the new assignment
 * @returns A promise that resolves to the assignment with assignmentId 
 *          when the assignment is successfully created.
 * @throws {FirebaseVerifyError} If the user is not authorized or, the chartId already exists, or the
 * truck attempted to assign to already has an existing active assignment
 */
export async function addAssignmentToOrg(token: string, organizationId: string, assignmentData: Omit<Assignment, "assignmentId">): Promise<Assignment> {
  // assignmentId is omitted, firestore database will automatically generate a documentId
  // used as the assignmentId.
  try {
    // Verify user has permission to WRITE to the assignments collection.
    const resourcePath = `organizations/${organizationId}/assignments`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if the truck attempting to assign is already assigned
    const truckHasActiveAssignment = await assignmentDatabase.isTruckCurrentlyAssigned(organizationId, assignmentData.truckId);
    if(truckHasActiveAssignment) {
      throw new FirebaseVerifyError(
        `Truck with ID "${assignmentData.truckId}" already assigned`,
        409 // Conflict
      );
    }

    // Add to database and return assignment
    return await assignmentDatabase.add(organizationId, assignmentData);

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
    const resourcePath = `organizations/${organizationId}/assignments/${assignmentId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if the assignment already exists
    if (!(await assignmentDatabase.exists(organizationId, assignmentId))) {
      throw new FirebaseVerifyError(`Assignment with ID "${assignmentId}" not found.`, 404);
    }

    await assignmentDatabase.update(organizationId, assignmentId, assignmentData);

  } catch (e) {
    console.error("Error in updateAssignmentInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for ending a user's currently active assignment (unassigning).
 * A subset of updateAssignmentInOrg but used enough to be
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
    // Make sure user can WRITE to assignment document
    const resourcePath = `organizations/${organizationId}/assignments/${assignmentId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Remove assignment from database
    await assignmentDatabase.remove(organizationId, assignmentId);
  } catch (e) {
    console.error("Error in deleteAssignmentFromOrg service:", e);
    throw e;
  }
}