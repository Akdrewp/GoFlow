// import "server-only";

import { z } from 'zod';

import { doc, DocumentData, getDoc } from 'firebase/firestore';

import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebaseAdmin'; // Assuming adminAuth is imported
import { db } from './firebaseConfig';
import { employeeDatabase, organizationDatabase, userDatabase, permissionsDatabase } from "./firestoreDatabase";
import { Organization, Employee, UserProfile, ORGANIZATION_RESOURCES, Role } from "../database/database";

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

const userOwnsOrganizationData = (
  userEmployeeProfile: Employee,
  resourceId: string,
  accessType: AccessType,
): boolean => {

  const resourceSegments = resourceId.split("/");

  const documentId = resourceSegments.at(-1);

  /**
   * Check if a user is trying to access
   * a document they made or is assigned to
   * 'trucks' or 'calibrationRecords'
   * 
   * @todo Finish off with calibration records and trucks
   * For now just assume of the form 'organizations/orgId/employees/employeeId'
   */
  // Check if user is trying to access own employee document
  if (accessType == AccessType.READ && documentId == userEmployeeProfile.employeeId) {
    return true;
  } else {
    return false;
  }
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
  if (!userProfile.employeeId || !userProfile.organizationId) {
    throw new FirebaseVerifyError(
      "User is not part of an organization, missing organizationId or employeeId",
      403 // Forbidden
    );
  }

  const userEmployeeProfile = await organizationDatabase.getEmployee(userProfile.organizationId, userProfile.employeeId);
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

      // Verify and get user profile
      const decodedIdToken = await isValidUserToken(token);
      const createdByUserProfile = await userDatabase.get(decodedIdToken.uid);

      // Only a user not part of an organization can create an organization
      if (createdByUserProfile?.employeeId || createdByUserProfile?.organizationId) {
        throw new FirebaseVerifyError("Cannot create an organization if user is already part of an organization", 403);
      }
      
      // Document id is organizationId
      const organizationId = organization.organizationId;
      const organizationAlreadyExists = await organizationDatabase.exists(organizationId);

      if (organizationAlreadyExists) {
        throw new FirebaseVerifyError("Organization with passed organizationId already exists", 409);
      }

      // Add the organization to the database
      await organizationDatabase.add(organization);

      // Create permission set with full access to all resources
      const adminPermissions = ORGANIZATION_RESOURCES.reduce((accumulator, resource) => {
        // For each resource in the array, add a new key to our accumulator object.
        accumulator[resource] = { read: true, write: true };
        return accumulator;
      }, {} as Role['permissions']); // Start with an empty object

      // Create admin role with full permissions
      const adminRole = {
        name: "admin",
        roleId: "admin",
        level: 100,
        permissions: adminPermissions
      };

      // Add admin role to database
      await organizationDatabase.addRole(organizationId, adminRole);

      // Add creator as employee with employeeId = 1
      const creatorEmployeeId = "1"; 
      const createdByUserId = organization.createdBy;
      const createdByUsername = createdByUserProfile.name;
      const createdByEmail = createdByUserProfile.email;
      await organizationDatabase.addEmployee(organization.organizationId,{
        name: createdByUsername,
        email: createdByEmail,
        roleId: "admin",
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
   * Gets the organization with passed organizationId
   * @param token token of user trying to access organization
   * @param organizationId id of organization trying to access
   * @returns A promise resolving to the found organization
   * @throws Error if user does not have permissions or organization
   * does not exist
   */
  get: async (token: string, organizationId: string): Promise<Organization> => {
    try {

      // Make sure user can read organization
      await canUserAccessData(token, `organizations/${organizationId}`, AccessType.READ);

      //Get and return organization
      const organization = await organizationDatabase.get(organizationId);

      return organization;
    } catch (e) {
      console.error("firebaseVerify organizationService.get Error", e);
      throw(e);
    }
    
    // Make sure user can read organization

  },

  /**
   * Adds employee with specified data to organization/employees database with organizationId
   * 
   * @param organizationId The organizationId of the organization to add employee to
   * @param employeeData Employee data
   * @returns A Promise resolving to true if the employee was added
   * @throws Error if employee could not be added
   */
  addEmployee: async (token: string, organizationId: string, employeeData: Employee): Promise<void> => {
    try {

      // Make sure user can write to employees
      await canUserAccessData(token, `organizations/${organizationId}/employees`, AccessType.WRITE);

      // Check if employee already exists
      const employeeIdAlreadyExists = await employeeDatabase.existsInOrg(organizationId, employeeData.employeeId);
      if (employeeIdAlreadyExists) {
        throw new FirebaseVerifyError(
          "Employee with passed employeeId already exists", 
          409 //Conflict
        );
      }
      
      //Check if role exists
      const employeeRoleExists = await organizationDatabase.roleExists(organizationId, employeeData.roleId);
      if (!employeeRoleExists) {
        throw new FirebaseVerifyError(
          `Employee with passed roleId: ${employeeData.roleId} does not exists in organization`, 
          400 // Bad Request
        );
      }

      // Add employee to organization
      await organizationDatabase.addEmployee(organizationId, employeeData);

    } catch (e) {
      console.error("Error adding employee:", e);
      throw(e);
    }
  },

  /**
   * Handles the business logic for adding a new role to an organization.
   * It verifies the user's permissions and ensures the role does not already exist.
   * @param token The user's Firebase ID token for authentication.
   * @param organizationId The ID of the organization to add the role to.
   * @param roleId The unique ID for the new role.
   * @param roleData An object containing the new role's data (name and permissions).
   * @returns A promise that resolves when the role is successfully created.
   * @throws {FirebaseVerifyError} If the user is not authorized, the role already exists, or for other validation failures.
   * @throws {Error} For unexpected internal server errors.
   */
  addRole: async (token: string, organizationId: string, roleData: Role): Promise<void> => {
    try {
      // Check if user can WRITE to roles
      const resourcePath = `organizations/${organizationId}/roles`;
      await canUserAccessData(token, resourcePath, AccessType.WRITE);

      // Check if with roleId already exists
      const roleExists = await organizationDatabase.roleExists(organizationId, roleData.roleId);
      if (roleExists) {
        throw new FirebaseVerifyError(
          `Role with ID "${roleData.roleId}" already exists in this organization.`,
          409 // Conflict
        );
      }

      // Add role to database
      await organizationDatabase.addRole(organizationId, roleData);

    } catch (e) {
      console.error("Error in organizationService.addRole: ", e);
      // Re-throw the error to be handled by the API route's catch block.
      throw(e);
    }
  },

  /**
   * Fetches all roles for a given organization after verifying the user's access rights.
   * @param token The user's Firebase ID token for authentication.
   * @param organizationId The ID of the organization from which to fetch roles.
   * @returns A promise that resolves to an array of Role objects for the organization.
   * @throws {FirebaseVerifyError} If the user does not have READ permission for roles in the specified organization.
   * @throws {Error} For unexpected internal server errors.
   */
  getRoles: async (token: string, organizationId: string): Promise<Role[]> => {
    try {
      // Check if user can read Roles
      const resourcePath = `organizations/${organizationId}/roles`;
      await canUserAccessData(token, resourcePath, AccessType.READ);

      // Get and return roles
      const roles = await organizationDatabase.getRoles(organizationId);
      return roles;

    } catch (e) {
      console.error("Error in organizationService.getRoles: ", e);
      throw e;
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
          // 400 Bad Request: The client provided an invalid organization ID.
          throw new FirebaseVerifyError("Organization with passed organizationId does not exist", 400);
        }

        // Check if employee exists in organization
        const employeeExists = await employeeDatabase.existsInOrg(organizationId, employeeId);
        if (!employeeExists) {
          // 400 Bad Request: The client provided an invalid employee ID for this org.
          throw new FirebaseVerifyError("Employee with passed employeeId does not exist in this organization", 400);
        }

        // Check if employee already has an account associated with it
        const isAssociated = await employeeDatabase.isAssociated(employeeId);
        if (isAssociated) {
          // 409 Conflict: The request cannot be completed because the employee is already linked.
          throw new FirebaseVerifyError("Employee with passed employeeId already associated with an account", 409);
        }

        // Activate the employee record
        await employeeDatabase.activate(organizationId, employeeId, uid);
      }

      // --- This runs for BOTH individual and organization sign-ups ---
      await userDatabase.add(userProfile);

      console.log("User document added/updated with UID: ", userProfile.uid);
    } catch (e) {
      console.error("Error adding user to database:", e);

      // Re-throw specific business logic errors or a generic one
      if (e instanceof FirebaseVerifyError) {
        throw e;
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