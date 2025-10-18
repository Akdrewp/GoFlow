// import "server-only";

import { z } from 'zod';

import { collection, doc, DocumentData, getDoc, getDocs } from 'firebase/firestore';

import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebaseAdmin'; // Assuming adminAuth is imported
import { db } from './firebaseConfig';
import { organizationDatabase, userDatabase, permissionsDatabase, employeeDatabase } from "./firestoreDatabase";
import { Employee, UserProfile, ORGANIZATION_RESOURCES } from "../database/database";

export enum AccessType {
  READ = "read",
  WRITE = "write",
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
 * Helper function for canUserAccessData
 * Deals with special cases in which an employee user should
 * be able to do certain actions even if their permissions
 * don't specifically allow for it.
 * 
 * Example: An employee should be able to assign their own
 * truck by creating an assignment but shouldn't have explicit
 * WRITE permissions to avoid writing other people's assignments
 */
const userOwnsOrganizationData = (
  userEmployeeProfile: Employee,
  resourceId: string,
  accessType: AccessType,
): boolean => {
  /**
   * Check if a user is trying to access
   * a document they made or is assigned to
   * 'trucks' or 'calibrationRecords'
   * 
   * @todo Finish off with calibration records and trucks
   * For now just assume of the form 'organizations/orgId/employees/employeeId'
   */


  // Organization resources are of the form "organizations/orgId/someResource/someResourceId"
  // where someResource/someResourceId is optional
  const evenNumberedPathSegmentRegex = /^organizations\/([^/]+)(?:\/([^/]+)\/([^/]+))?$/;
  const documentResource = resourceId.match(evenNumberedPathSegmentRegex);

  const resourceSegments = resourceId.split("/");

  if (documentResource) {
    // resrouceId is of the form "organizations/orgId/someResource/someResourceId"
    const documentId = resourceSegments.at(-1);

    // Check if user is trying to access own employee document
    if (accessType == AccessType.READ && documentId == userEmployeeProfile.employeeId) {
      return true;
    } else {
      return false;
    }
  }

  // Catch any unexpected conditions
  return false;

};

/**
 * Safely verifies if a user can access a specified orgazition route
 * Helper function for canUserAccessData
 * @param token The user's Firebase ID token for authentication.
 * @param resourceId The unique identifier for the resource being accessed.
 * @throws An error if the token is null, invalid, or expired. Or user does not have access
 * @returns A promise that resolves if the user can access said resource
 */
const canUserAccessOrganizationData = async (
  userProfile: UserProfile,
  resourceId: string,
  accessType: AccessType,
): Promise<void> => {
  console.log("canUserAccessData CONSOLE LOG resource is organization", resourceId);

  // If user is not part of an organization throw error
  if (userProfile.type == "individual") {
    throw new FirebaseVerifyError(
      "User is not part of an organization, missing organizationId or employeeId",
      403 // Forbidden
    );
  }

  const userEmployeeProfile = await employeeDatabase.get(userProfile.organizationId, userProfile.employeeId);
  const userEmployeeRoleId = userEmployeeProfile?.roleId;

  // Check if segments is an odd number meaning
  // user is trying to write a new document to a collection
  // resourceId is of form "organizations/orgId/collectionName"
  const oddNumberedPathSegmentRegex = /^organizations\/[^\/]+(?:\/[^\/]+\/[^\/]+)*\/[^\/]+$/;
  const oddNumberedPathSegmentMatch = resourceId.match(oddNumberedPathSegmentRegex);

  // Organization resources are of the form "organizations/orgId/someResource/someResourceId"
  // where someResource/someResourceId is optional
  const evenNumberedPathSegmentRegex = /^organizations\/([^/]+)(?:\/([^/]+)\/([^/]+))?$/;
  const evenNumberedPathSegmentMatch = resourceId.match(evenNumberedPathSegmentRegex);

  // Check if resourseId matches schema
  if (!(evenNumberedPathSegmentMatch || oddNumberedPathSegmentMatch)) {
    // Doesn't match required resourceId schema
    throw new FirebaseVerifyError(
      "Invalid resourceId provided", 
      400 // Bad request
    );     
  }

  const resourceSegments = resourceId.split("/");

  // OrganizationId is the second segment
  const resourceOrgId = resourceSegments[1];

  // Check if resource isn't part of user organization trying to edit
  if (resourceOrgId != userProfile.organizationId) {
    throw new FirebaseVerifyError(
      "Forbidden: User is not a member of the requested organization.", 
      403 // Forbidden
    );
  }

  // If user "owns" the document let them access
  if (userOwnsOrganizationData(userEmployeeProfile, resourceId, accessType)) {
    return;
  }

  // Otherwise check if user has general permission to access document
  const accessStatus = await permissionsDatabase.getAccessStatus(userProfile.organizationId, userEmployeeRoleId, resourceId, accessType);

  if (!accessStatus) {
    // The user is authenticated, but not authorized
    throw new FirebaseVerifyError(
      `User does not have permission for accessType: ${accessType} on resourceId: ${resourceId}`,
      403 // Forbidden
    );
  }

};

/**
 * Safely verifies if a user can access a specific resource 
 * with specified permissions. It handles
 * both authentication (token verification) and authorization (permission check).
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

    console.log("canUserAccessData CONSOLE LOG resourceId: ", resourceId);

    const decodedIdToken = await isValidUserToken(token);

    // Verify that the user has a profile in your database
    const userProfile = await userDatabase.get(decodedIdToken.uid);
    if (!userProfile) {
      throw new Error(`User with UID ${decodedIdToken.uid} is authenticated but has no database profile.`);
    }

    // Check if trying to access organization resource
    const isOrganizationResource = ORGANIZATION_RESOURCES.some(resource => resourceId.includes(resource));
    if (isOrganizationResource) {
      // Check if user can access this organization data
      await canUserAccessOrganizationData(userProfile, resourceId, accessType);

      // Passed auth check
      return decodedIdToken;
    } else { // User is trying to access data from their profile

      console.log("canUserAccessData CONSOLE LOG resource is user resource: ", resourceId);

      // resourceId should be of the form "users/fooId" where fooId is the userId

      // The regular expression to match "users/{fooId}"
      const validResourceRegex = /^users\/([^/]+)$/;

      // Check if resourceId matches expected resourceId
      const isValidResourceId = resourceId.match(validResourceRegex);
      if (!isValidResourceId) {
        throw new FirebaseVerifyError(
          "Invalid resourceId provided",
          400 // Bad request
        );
      }

      // Split users from fooId 
      const pathSegments = resourceId.split('/');
      const resourceUserId = pathSegments[1];

      // Check if user is getting their own resource
      if (resourceUserId != userProfile.uid) {
        throw new FirebaseVerifyError(
          `User does not have permission for accessType: ${accessType} on resourceId: ${resourceId}`,
          403 // Forbidden
        );
      }

      // If we get here, everything is valid.
      return decodedIdToken;
    }
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
): Promise<DocumentData | DocumentData[]> => {
  
  // Check if user can read the data
  // This will throw an error if not
  await canUserAccessData(token, resourceId, AccessType.READ);

  // 2. If access is granted, fetch and return the data.
  console.log(`Access granted. Fetching data for resource ${resourceId}...`);

  const resourceSegments = resourceId.split("/").length;

  // If trying to access one document
  // resourceId = "someCollection/someDocument/otherCollection/documentName"
  if (resourceSegments % 2 == 0) {

    // Get document reference
    const docRef = doc(db, resourceId);

    // Get the document and make sure it exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new FirebaseVerifyError(
        "data with passed resourceId does not exist",
        400 // Bad request
      );
    }

    return docSnap.data();
  } else {
    // If trying to access a collection
    // resourceId = "someCollection/someDocument/collectionName"
    
    // Get collection
    const collectionRef = collection(db, resourceId);
    const querySnapshot = await getDocs(collectionRef);

    // Check if collection has data
    if (querySnapshot.empty) {
      // If no data return empty array
      return [];
      throw new FirebaseVerifyError(
        "Collection with passed resourceId has no data",
        400 // Bad request
      );
    }

    const collectionData = querySnapshot.docs.map(doc => doc.data());

    return collectionData;
  }
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
  resourceData: z.infer<T>,
  schema: T
): Promise<z.infer<T>> => {
  
  const validation = schema.safeParse(resourceData);
  if (!validation.success) {
  // Handle validation error
  return { success: false, error: "Invalid data provided." };
  }

  //See if user can perform such actions on the resource
  await canUserAccessData(token, resourceId, AccessType.WRITE);

  const validatedData = validation.data; 

  // ... update Firestore with validatedData ...

  return validatedData;
};