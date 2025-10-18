import { ORGANIZATION_RESOURCES, Role } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError } from "../firebaseVerify";
import { roleDatabase } from "../firestoreDatabase";

// Helper function validates premissions are defined for every resource
const isValidRolePermissions = (permissions: Role['permissions']): boolean => {
  return ORGANIZATION_RESOURCES.every(resource => {
    return Object.hasOwn(permissions, resource);
  });
};
/**
 * Handles the business logic for adding a new role to an organization.
 * @param token The admin's Firebase ID token.
 * @param organizationId The ID of the organization to add the role to.
 * @param roleData The data for the new role.
 * @throws An error if permissions are insufficient or if the role ID already exists.
 */
export async function addRoleToOrg(token: string, organizationId: string, roleData: Role): Promise<void> {
  try {
    console.log("roleData", roleData);

    // Verify user has permission to write to the roles collection
    const resourcePath = `organizations/${organizationId}/roles`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Business Logic: Check if the role ID already exists
    if (await roleDatabase.exists(organizationId, roleData.roleId)) {
      throw new FirebaseVerifyError(
        `Role with ID "${roleData.roleId}" already exists in this organization.`,
        409 // Conflict
      );
    }

    // Check if permissions are not valid
    if (!isValidRolePermissions(roleData.permissions)) {
      throw new FirebaseVerifyError(
        `Role permissions invalid, all resources must be defined`,
        400 // Bad Request
      );
    }

    // Add the role via the database repository
    await roleDatabase.add(organizationId, roleData.roleId, roleData);
  } catch (e) {
    console.error("Error in addRoleToOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for updating an existing role.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param roleId The ID of the role to update.
 * @param roleData The partial data for the role to update.
 * @returns A promise that resolves when the role is successfully updated.
 * @throws {FirebaseVerifyError} If the user is not authorized or the role does not exist.
 */
export async function updateRoleInOrg(token: string, organizationId: string, roleId: string, roleData: Partial<Role>): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific role document.
    const resourcePath = `organizations/${organizationId}/roles/${roleId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Business Logic: Prevent changing the roleId via an update.
    if (roleData.roleId && roleId !== roleData.roleId) {
      throw new FirebaseVerifyError("The roleId cannot be changed during an update.", 400);
    }

    // Update the role in the database
    await roleDatabase.update(organizationId, roleId, roleData);

  } catch (e) {
    console.error("Error in updateRoleInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for deleting a role from an organization.
 * Prevents deletion if the role is currently in use by any employees.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param roleId The ID of the role to delete.
 * @returns A promise that resolves when the role is successfully deleted.
 * @throws {FirebaseVerifyError} If the user is not authorized, the role does not exist, or it is in use.
 */
export async function deleteRoleFromOrg(token: string, organizationId: string, roleId: string): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific role document.
    const resourcePath = `organizations/${organizationId}/roles/${roleId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if the role is currently assigned to any employees.
    if (await roleDatabase.isRoleInUse(organizationId, roleId)) {
      throw new FirebaseVerifyError(
        `Cannot delete role "${roleId}" because it is currently assigned to one or more employees.`,
        409 // Conflict
      );
    }

    // Delete the role from the database
    await roleDatabase.remove(organizationId, roleId);

  } catch (e) {
    console.error("Error in deleteRoleFromOrg service:", e);
    throw e;
  }
}

/**
 * Determines if a role has full administrative privileges by checking
 * if it has read and write access to every defined resource.
 * @param roleId The Role Id of the role to check.
 * @returns True if the role has full permissions, false otherwise.
 */
export async function isManagerRole(token: string, organizationId: string, roleId: string) {
  const role = await roleDatabase.get(organizationId, roleId);

  // Returns true only when every member of permissions
  // has read and write permissions
  return ORGANIZATION_RESOURCES.every(resource => {
    const permission = role.permissions[resource];
    return permission && permission.read && permission.write;
  });
}
