import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebaseAdmin'; // Assuming adminAuth is imported

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
 * Safely verifies if a user can access a specific resource. It handles
 * both authentication (token verification) and authorization (permission check).
 * @todo
 * @param token The user's Firebase ID token for authentication.
 * @param resourceId The unique identifier for the resource being accessed.
 * @returns A promise that resolves to `true` if the user has access,
 * or `false` if they do not or if an error occurs.
 */
export const canUserAccessData = async (
  token: string,
  resourceId: string
): Promise<boolean> => {
  try {
    // 1. Authenticate the user by verifying their token.
    // If the token is invalid, isValidUserToken will throw an error,
    // which will be caught by the catch block below.
    const decodedIdToken = await isValidUserToken(token);
    
    // 2. Authorize the user by checking permissions in the database.
    console.log(`Checking permissions for user ${decodedIdToken.uid} on resource ${resourceId}...`);

    // const hasPermission = await db.users(uid).canAccess(resourceId);
    const hasPermission = true; // Placeholder for the actual database check.

    return hasPermission;

  } catch (error) {
    // This block catches errors from `isValidUserToken` (authentication failure)
    // or any errors during the authorization step. It returns false for any failure.
    console.error("Access check failed during token validation or permission check:", (error as Error).message);
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
  const hasAccess = await canUserAccessData(token, resourceId);

  if (!hasAccess) {
    return { success: false, error: "Access denied. User is not authorized to view this resource." };
  }

  // 2. If access is granted, fetch and return the data.
  console.log(`Access granted. Fetching data for resource ${resourceId}...`);
  return { success: true, data: "fakedata" };
};
