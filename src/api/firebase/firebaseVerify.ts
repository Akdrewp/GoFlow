import "server-only";

import { z } from 'zod';

import { doc, DocumentData, getDoc } from 'firebase/firestore';

import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebaseAdmin'; // Assuming adminAuth is imported
import { db } from './firebaseConfig';
import { organizationDatabase, userDatabase } from "./firestoreDatabase";
import { Organization } from "../database/database";

export enum AccessType {
  READ = "READ",
  WRITE = "WRITE",
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
 * @todo
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
        throw new Error("Organization with passed organization id already exists");
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
      userDatabase.


    } catch (e) {
      console.error("Error adding organization to database:", e);
      throw new Error(`Failed to add organization to database: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * Checks if an organization with the given ID exists.
   * @param organizationId - The ID of the organization to check.
   * @returns A Promise resolving to true if the organization exists, false otherwise.
   */
  exists: async (customOrganizationId: string): Promise<boolean> => {
    try {
      // A direct get is more efficient than a query if the doc ID is the custom ID
      const orgDocRef = doc(db, "organizations", customOrganizationId);
      const docSnap = await getDoc(orgDocRef);
      return docSnap.exists();
    } catch (e) {
      console.error("Error checking organization existence:", e);
      throw new Error(`Failed to check organization existence: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * Adds employee with specified data to organization with organizationId
   * @param organizationId The organizationId of the organization to add employee to
   * @param employeeData Employee data
   * @returns A Promise resolving to true if the employee was added
   * @throws Error if employee could not be added
   */
  addEmployee: async (organizationId: string, employeeData: Employee): Promise<void> => {
    try {
      // The path is contextual to the organization
      const employeeDocRef = doc(db, `organizations/${organizationId}/employees`, employeeData.employeeId);
      
      await setDoc(employeeDocRef, {
        ...employeeData,
      });

      console.log(`Employee ${employeeData.employeeId} added to organization ${organizationId}`);
    } catch (e) {
      console.error("Error adding employee:", e);
      throw new Error(`Failed to add employee: ${(e as Error).message}`);
    }
  },
};