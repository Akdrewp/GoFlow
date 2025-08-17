import "server-only";

import { z } from 'zod';

import { doc, DocumentData, getDoc } from 'firebase/firestore';

import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebaseAdmin'; // Assuming adminAuth is imported
import { db } from './firebaseConfig';
import { employeeDatabase, organizationDatabase, userDatabase, firebaseDatabaseError } from "./firestoreDatabase";
import { Organization, Employee, UserProfile } from "../database/database";

export enum AccessType {
  READ = "READ",
  WRITE = "WRITE",
}

export class FirebaseVerifyError extends Error {
    public readonly code: number;

    constructor(message: string, code: number) {
        super(message);
        this.name = "FirebaseVerifyError";
        this.code = code;
    }
}

/**
 * Verifies a user's ID token and throws an error if it's invalid.
 * @param token The user's ID token to be verified.
 * @returns A promise that resolves to the decoded ID token if valid.
 * @throws An error if the token is null, invalid, or expired.
 */
export const isValidUserToken = async (token: string): Promise<DecodedIdToken> => {
  try {
    // Quick check to avoid running if null
    if (!token) {
      throw new Error("Token is null or undefined.");
    }
    // Check if token is valid
    const decodedIdToken = await adminAuth.verifyIdToken(token);
    // If token is valid, return the decoded data
    return decodedIdToken;
  } catch (e) {
    // Token is invalid
    console.error("Error validating token:", e);
    throw new Error("Authentication token is invalid or expired.");
  }
};

/**
 * Safely verifies if a user can access a specific resource 
 * with specified permissions. It handles
 * both authentication (token verification) and authorization (permission check).
 * @todo Check if user is in the database
 * @param token The user's Firebase ID token for authentication.
 * @param resourceId The unique identifier for the resource being accessed.
 * @throws An error if the token is null, invalid, or expired. Or user does not have access
 * @returns A promise that resolves to decodedIdToken of the passed token OR 
 */
export const canUserAccessData = async (
  token: string,
  resourceId: string,
  accessType: AccessType,
): Promise<DecodedIdToken> => {
  try {

    const decodedIdToken = await isValidUserToken(token);

    // Verify that the user has a profile in your database
    const userProfile = await userDatabase.get(decodedIdToken.uid);
    if (!userProfile) {
      throw new Error(`User with UID ${decodedIdToken.uid} is authenticated but has no database profile.`);
    }
    
    /**
     * @todo Replace with check permissions logic
     */
    const hasPermission = true;

    if (!hasPermission) {
      // The user is authenticated, but not authorized. Throw a specific error.
      throw new Error(`User ${decodedIdToken.uid} is not authorized to ${accessType} resource ${resourceId}.`);
    }

    // If we get here, everything is valid.
    return decodedIdToken;

  } catch (error) {
    // Re-throw the error to be handled by the caller (e.g., the API route)
    console.error("Access check failed:", (error as Error).message);
    throw (error);
  }
};

/**
 * Fetches data for a specific resource after verifying user access.
 * @param token The user's Firebase ID token for authentication.
 * @param resourceId The unique identifier for the resource being accessed.
 * @returns A promise that resolves to an object containing the requested
 * data
 * @throws Error if user cannot access data or data does not exists
 */
export const getDataForResource = async (
  token: string,
  resourceId: string
): Promise<DocumentData> => {
  
  // Check if user can read the data
  // This will throw an error if not
  await canUserAccessData(token, resourceId, AccessType.READ);

  // 2. If access is granted, fetch and return the data.
  console.log(`Access granted. Fetching data for resource ${resourceId}...`);

  // Using client db firebase rules apply and will throw an error
  // if user is not allowed to access data creating a second layer
  // of authentication
  const docRef = doc(db, resourceId);
  const docSnap = await getDoc(docRef);

  // This should already be taken care of by canUserAccessData
  // but checking whether it exists again is fine
  if (!docSnap.exists()) {
    throw new Error("data with passed resourceId does not exist");
  }

  // Log the object directly to see its contents.
  console.log(`Data for resource ${resourceId}:`, docSnap.data());

  return docSnap.data();
};

/**
 * Updates a resource resource by adding a document after verifying user access.
 * Creates resource if resource has not been created yet.
 * @param token The user's Firebase ID token for authentication.
 * @param resourceId The unique identifier for the resource being updated
 * @param resourceData resourceData to be added to a doc must follow zod type
 * @returns A promise that resolves to an object containing the requested
 * data
 * @throws Error if user cannot access data or data does not exists
 */
export const updateResource = async <T extends z.ZodTypeAny>(
  token: string,
  resourceId: string,
  resourceData: z.infer<T>, // Data MUST match the schema's inferred type
  schema: T                  // The Zod schema itself
): Promise<z.infer<T>> => {
  
  const validation = schema.safeParse(resourceData);
  if (!validation.success) {
    // Handle validation error
    return { success: false, error: "Invalid data provided." };
  }

  //See if user can perform such actions on the resource
  await canUserAccessData(token, resourceId, AccessType.WRITE);

  // `validation.data` is now fully typed
  const validatedData = validation.data; 

  // ... update Firestore with validatedData ...

  return validatedData;
};

export const organizationService = {
  /**
   * Handles creating a new organization.
   * Adds organization to the database and adds the creator as
   * employee
   * @param organization - The organization's data.
   * @returns A Promise that resolves when the operation is complete.
   */
  create: async (token: string, organization: Organization): Promise<void> => {
    try {

      // Make sure user can write to organizations
      const decodedIdToken = await canUserAccessData(token, `organizations/${organization.organizationId}`, AccessType.WRITE);

      // Document id is organizationId
      const organizationId = organization.organizationId;
      const organizationAlreadyExists = await organizationDatabase.exists(organizationId);

      if (organizationAlreadyExists) {
        throw new FirebaseVerifyError("Organization with passed organizationId already exists", 409);
      }

      // Add the organization to the database
      await organizationDatabase.add(organization);

      const createdByUserProfile = await userDatabase.get(decodedIdToken.uid);

      // Add creator as employee with employeeId = 1
      const creatorEmployeeId = "1"; 
      const createdByUserId = organization.createdBy;
      const createdByUsername = createdByUserProfile.name;
      const createdByEmail = createdByUserProfile.email;
      await organizationDatabase.addEmployee(organization.organizationId,{
        name: createdByUsername,
        email: createdByEmail,
        role: "admin",
        status: "active",
        employeeId: creatorEmployeeId,
        uid: createdByUserId,
      });

      // Update user information in database
      // Add employeeId and organizationId to account
      await userDatabase.update(createdByUserId, {
        employeeId: creatorEmployeeId,
        organizationId: organizationId,
      });


    } catch (e) {
      console.error("Error adding organization to database:", e);
      throw(e);
    }
  },

  /**
   * Adds employee with specified data to organization with organizationId
   * @param organizationId The organizationId of the organization to add employee to
   * @param employeeData Employee data
   * @returns A Promise resolving to true if the employee was added
   * @throws Error if employee could not be added
   */
  addEmployee: async (token: string, organizationId: string, employeeData: Employee): Promise<void> => {
    try {

      // Make sure user can write to employees
      await canUserAccessData(token, `organizations/${organizationId}/employees`, AccessType.WRITE);

      // Make sure it's not a duplicate employeeId
      const employeeIdAlreadyExists = await employeeDatabase.existsInOrg(organizationId, employeeData.employeeId);
      if (employeeIdAlreadyExists) {
        throw new FirebaseVerifyError("Employee with passed employeeId already exists", 409); //Conflict
      }

      // Add employee to organization
      await organizationDatabase.addEmployee(organizationId, employeeData);

    } catch (e) {
      console.error("Error adding employee:", e);
      throw(e);
    }
  },
};

export const userService = {
  /**
   * Adds or updates a user's profile information in the 'users' collection.
   * @param userProfile - The user's profile data.
   * @returns A Promise that resolves when the operation is complete.
   * @throws Error if userProfile includes orgnaizationId and employeeId
   * but orgnization does not exist, employee does not exist, or
   * employee already has an associated account.
   */
  add: async (userProfile: UserProfile): Promise<void> => {
    try {
      if (userProfile.employeeId && userProfile.organizationId) {
        const { organizationId, employeeId, uid } = userProfile;

        // Check if the organization exists
        if (!(await organizationDatabase.exists(organizationId))) {
            throw new firebaseDatabaseError("Organization with passed organizationId does not exist");
        }

        // Check if employee exists in organization
        const employeeExists = await employeeDatabase.existsInOrg(organizationId, employeeId);
        if (!employeeExists) {
            throw new firebaseDatabaseError("Employee with passed employeeId does not exist in this organization");
        }

        // Check if employee already has an account associated with it
        const isAssociated = await employeeDatabase.isAssociated(employeeId);
        if (isAssociated) {
            throw new firebaseDatabaseError("Employee with passed employeeId already associated with an account");
        }

        // Activate the employee record
        await employeeDatabase.activate(organizationId, employeeId, uid);
      }

      // --- This runs for BOTH individual and organization sign-ups ---
      await userDatabase.add(userProfile);

      console.log("User document added/updated with UID: ", userProfile.uid);
    } catch (e) {

      console.error("Error adding user to database:", e);

      if (e instanceof firebaseDatabaseError) {
        throw(e);
      } else {
        throw new Error(`Failed to add user to database: ${(e as Error).message || 'Unknown error'}`);
      }
    }
  },

  /**
   * Fetches a user's profile from the 'users' collection by their UID.
   * @param uid - The user's Firebase Auth UID.
   * @returns A Promise resolving to the UserProfile if found
   * @throws Error if user is not found
   */
  get: async (token: string, uid: string): Promise<UserProfile> => {
    try {

      await canUserAccessData(token, `users/${uid}`, AccessType.READ);

      const userProfile = await userDatabase.get(uid);

      return userProfile;
    } catch (e) {
      console.error(`Error getting user profile for UID ${uid}:`, e);
      throw new Error(`Failed to get user profile: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * Updates an existing user's profile in the database.
   * @param uid The UID of the user to update.
   * @param userProfile An object containing the new profile data to apply.
   * @returns A Promise that resolves with the updated user profile data.
   * @throws An error if the user document does not exist or the update fails.
   * @todo not sure whether to use Partial for userProfile or require the entire
   * UserProfile objects
   */
  update: async (token: string, uid: string, userProfile: Partial<UserProfile>): Promise<UserProfile> => {

    try {
      await canUserAccessData(token, `users/${uid}`, AccessType.READ);

      const userProfileUpdated = await userDatabase.update(uid, userProfile);

      return userProfileUpdated;

    } catch (e) {
        console.error(`Error updating user profile for UID ${uid}:`, e);
        throw new Error(`Failed to update user profile: ${(e as Error).message || 'Unknown error'}`);
    }
  }
};