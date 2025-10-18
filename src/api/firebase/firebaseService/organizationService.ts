// --- Organization Service Functions ---

import { Organization, ORGANIZATION_RESOURCES, Role } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError, isValidUserToken } from "../firebaseVerify";
import { organizationDatabase, roleDatabase, userDatabase } from "../firestoreDatabase";

/**
 * Handles the business logic for creating a new organization.
 * It adds the organization to the database and designates the creator as the first admin employee.
 * @param token The creator's Firebase ID token.
 * @param organization The data for the new organization.
 * @returns A Promise that resolves when the operation is complete.
 * @throws {FirebaseVerifyError}
 *  If the user is already in an organization or the organization ID already exists.
 */
export async function createOrganization(token: string, organization: Organization): Promise<void> {
  try {
    // Verify and get user profile
    const decodedIdToken = await isValidUserToken(token);
    const createdByUserProfile = await userDatabase.get(decodedIdToken.uid);

    // Only a user not part of an organization can create one
    if (createdByUserProfile.type == "organization") {
      throw new FirebaseVerifyError(
        "Cannot create an organization if user is already part of an organization",
        403 // Forbidden
      );
    }
    
    // Check if the organization already exists
    const organizationId = organization.organizationId;
    if (await organizationDatabase.exists(organizationId)) {
      //Change all the errors to be of this format
      throw new FirebaseVerifyError(
        "Organization with passed organizationId already exists",
        409 // Conflict
      );
    }

    // Add the organization to the database
    await organizationDatabase.add(organization);

    // Create a default admin role with full permissions
    const adminPermissions = ORGANIZATION_RESOURCES.reduce((accumulator, resource) => {
      accumulator[resource] = { read: true, write: true };
      return accumulator;
    }, {} as Role['permissions']);

    const adminRole: Role = {
      name: "admin",
      roleId: "admin",
      level: 100,
      permissions: adminPermissions
    };
    await roleDatabase.add(organizationId, adminRole.roleId, adminRole);

    // Add creator as the first employee with the admin role
    const creatorEmployeeId = "1"; 
    await organizationDatabase.addEmployee(organization.organizationId, {
      name: createdByUserProfile.name,
      email: createdByUserProfile.email,
      roleId: "admin",
      status: "active",
      employeeId: creatorEmployeeId,
      uid: organization.createdBy,
    });

    // Update the creator's user document to link them to the new organization
    await userDatabase.update(organization.createdBy, {
      type: "organization",
      employeeId: creatorEmployeeId,
      organizationId: organizationId,
    });

  } catch (e) {
    console.error("Error creating organization:", e);
    throw e;
  }
}

/**
 * Fetches an organization's data after verifying the user has read access.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization to fetch.
 * @returns A promise resolving to the organization's data.
 * @throws An error if the user does not have permission or the organization does not exist.
 */
export async function getOrganization(token: string, organizationId: string): Promise<Organization> {
  try {
    // Verify the user has permission to read this organization's data
    await canUserAccessData(token, `organizations/${organizationId}`, AccessType.READ);
    // Fetch and return the organization data
    return await organizationDatabase.get(organizationId);
  } catch (e) {
    console.error("Error in getOrganization service:", e);
    throw e;
  }
}

/**
 * Fetches all roles for an organization after verifying user access.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @returns A promise resolving to an array of the organization's roles.
 */
export async function getRolesForOrg(token: string, organizationId: string): Promise<Role[]> {
  try {
    // Verify user has permission to read the roles collection
    const resourcePath = `organizations/${organizationId}/roles`;
    await canUserAccessData(token, resourcePath, AccessType.READ);
    
    // Fetch and return the roles
    return await organizationDatabase.getRoles(organizationId);
  } catch (e) {
    console.error("Error in getRolesForOrg service:", e);
    throw e;
  }
}