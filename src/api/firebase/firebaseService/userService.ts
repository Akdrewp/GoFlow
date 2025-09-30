// --- User Service Functions ---

import { employeeDatabase, FirestoreDatabaseError, organizationDatabase, userDatabase } from "../firestoreDatabase";
import { AccessType, canUserAccessData, FirebaseVerifyError } from "../firebaseVerify";
import { UserProfile } from "@/api/database/database";

/**
 * Handles the business logic for adding a user to the database, including organization sign-up validation.
 * @param userProfile The profile data for the user being added.
 * @throws An error if organization sign-up validation fails.
 */
export async function addUser(userProfile: UserProfile): Promise<void> {
  try {
    // Handle the specific logic for an organization sign-up
    if (userProfile.type == "organization") {
      const { organizationId, employeeId, uid } = userProfile;

      if (!(await organizationDatabase.exists(organizationId))) {
        throw new FirebaseVerifyError(
          "Organization with passed organizationId does not exist", 
          400 // Bad request
        );
      }
      if (!(await employeeDatabase.existsInOrg(organizationId, employeeId))) {
        throw new FirebaseVerifyError(
          "Employee with passed employeeId does not exist in this organization", 
          400 // Bad request
        );
      }
      if (await employeeDatabase.isAssociated(employeeId)) {
        throw new FirebaseVerifyError(
          "Employee with passed employeeId already associated with an account", 
          409 // Conflict
        );
      }

      // If all checks pass, activate the employee record and create the user profile
      await employeeDatabase.activate(organizationId, employeeId, uid);
    }
    
    // This runs for both individual and organization sign-ups
    await userDatabase.add(userProfile);
  } catch (e) {
    console.error("Error adding user to database:", e);
    if (e instanceof FirebaseVerifyError 
      || e instanceof FirestoreDatabaseError) {
      throw e;
    }
    throw new Error(`Failed to add user to database: ${(e as Error).message}`);
  }
}

/**
 * Fetches a user's profile after verifying the requester has read access.
 * @param token The requester's Firebase ID token.
 * @param uid The UID of the user profile to fetch.
 * @returns A promise resolving to the user's profile data.
 */
export async function getUser(token: string, uid: string): Promise<UserProfile> {
  try {
    // Verify the user can read the target user's profile (usually limited to self-access)
    await canUserAccessData(token, `users/${uid}`, AccessType.READ);
    return await userDatabase.get(uid);
  } catch (e) {
    console.error(`Error getting user profile for UID ${uid}:`, e);
    throw e;
  }
}

/**
 * Updates a user's profile after verifying the requester has write access.
 * @param token The requester's Firebase ID token.
 * @param uid The UID of the user profile to update.
 * @param userProfile An object containing the fields to update.
 * @returns A promise resolving to the updated user profile data.
 */
export async function updateUser(token: string, uid: string, userProfile: Partial<UserProfile>): Promise<UserProfile> {
  try {
    // Verify the user can write to the target user's profile
    await canUserAccessData(token, `users/${uid}`, AccessType.WRITE);
    return await userDatabase.update(uid, userProfile);
  } catch (e) {
    console.error(`Error updating user profile for UID ${uid}:`, e);
    throw e;
  }
}