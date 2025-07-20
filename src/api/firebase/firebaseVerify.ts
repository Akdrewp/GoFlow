import { z } from 'zod';

import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebaseAdmin'; // Assuming adminAuth is imported

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
 * data if access is granted, or an error message if it is denied.
 */
export const getDataForResource = async (
  token: string,
  resourceId: string
): Promise<{ success: boolean; data?: string; error?: string }> => {
  const hasAccess = await canUserAccessData(token, resourceId, AccessType.READ);

  if (!hasAccess) {
    return { success: false, error: "Access denied. User is not authorized to view this resource." };
  }

  // 2. If access is granted, fetch and return the data.
  console.log(`Access granted. Fetching data for resource ${resourceId}...`);
  return { success: true, data: "fakedata" };
};

/**
 * Updates a resource resource by adding a document after verifying user access.
 * Creates resource if resource has not been created yet.
 * @param token The user's Firebase ID token for authentication.
 * @param resourceId The unique identifier for the resource being updated
 * @param resourceData resourceData to be added to a doc must follow zod type
 * @returns A promise that resolves to an object containing the requested
 * data if access is granted, or an error message if it is denied.
 */
export const updateResource = async <T extends z.ZodTypeAny>(
  token: string,
  resourceId: string,
  resourceData: z.infer<T>, // Data MUST match the schema's inferred type
  schema: T                  // The Zod schema itself
): Promise<{ success: boolean; data?: z.infer<T>; error?: string }> => {
  
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

  return { success: true, data: validatedData };
};