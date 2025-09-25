import { CalibrationChart, Employee, Organization, ORGANIZATION_RESOURCES, Role, Truck, UserProfile } from "../database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError,
   isValidUserToken } from "./firebaseVerify";
import { chartDatabase, employeeDatabase, FirestoreDatabaseError, organizationDatabase, truckDatabase, userDatabase } from "./firestoreDatabase";

// --- Organization Service Functions ---

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
    if (createdByUserProfile?.employeeId || createdByUserProfile?.organizationId) {
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
    await organizationDatabase.addRole(organizationId, adminRole);

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
 * Handles the business logic for adding a new employee to an organization.
 * @param token The admin/manager's Firebase ID token.
 * @param organizationId The ID of the organization to add the employee to.
 * @param employeeData The data for the new employee.
 * @throws An error if permissions are insufficient or if the employee/role validation fails.
 */
export async function addEmployeeToOrg(token: string, organizationId: string, employeeData: Employee): Promise<void> {
  try {
    // Verify user has permission to write to the employees collection
    await canUserAccessData(token, `organizations/${organizationId}/employees`, AccessType.WRITE);

    // Business Logic: Check for duplicate employee ID
    if (await employeeDatabase.existsInOrg(organizationId, employeeData.employeeId)) {
      throw new FirebaseVerifyError(
        "Employee with passed employeeId already exists",
        409 // Conflict
      );
    }
    
    // Business Logic: Check if the assigned role exists
    if (!(await organizationDatabase.roleExists(organizationId, employeeData.roleId))) {
      throw new FirebaseVerifyError(
        `Employee with passed roleId: ${employeeData.roleId} does not exist in organization`,
        400 // Bad request
      );
    }

    // Add the employee via the database repository
    await organizationDatabase.addEmployee(organizationId, employeeData);
  } catch (e) {
    console.error("Error adding employee to organization:", e);
    throw e;
  }
}

/**
 * Handles the business logic for adding a new role to an organization.
 * @param token The admin's Firebase ID token.
 * @param organizationId The ID of the organization to add the role to.
 * @param roleData The data for the new role.
 * @throws An error if permissions are insufficient or if the role ID already exists.
 */
export async function addRoleToOrg(token: string, organizationId: string, roleData: Role): Promise<void> {
  try {
    // Verify user has permission to write to the roles collection
    const resourcePath = `organizations/${organizationId}/roles`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Business Logic: Check if the role ID already exists
    if (await organizationDatabase.roleExists(organizationId, roleData.roleId)) {
      throw new FirebaseVerifyError(
        `Role with ID "${roleData.roleId}" already exists in this organization.`,
        409 // Conflict
      );
    }

    // Add the role via the database repository
    await organizationDatabase.addRole(organizationId, roleData);
  } catch (e) {
    console.error("Error in addRoleToOrg service:", e);
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

// --- Truck Service Functions ---

/**
 * Handles the business logic for adding a new truck to an organization.
 * It verifies the user's permissions and ensures the truck does not already exist.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization to add the truck to.
 * @param truckData The data for the new truck.
 * @returns A promise that resolves when the truck is successfully created.
 * @throws {FirebaseVerifyError} If the user is not authorized or the truck ID already exists.
 */
export async function addTruckToOrg(token: string, organizationId: string, truckData: Truck): Promise<void> {
  try {
    // Make sure user can WRITE to trucks
    const resourcePath = `organizations/${organizationId}/trucks`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if truck already exists
    if (await truckDatabase.truckExists(organizationId, truckData.truckId)) {
      throw new FirebaseVerifyError(
        `Truck with ID "${truckData.truckId}" already exists in this organization.`,
        409 // Conflict
      );
    }

    // Add truck to database
    await truckDatabase.addTruck(organizationId, truckData);

    console.log("addTruckToOrg CONSOLE LOG added truck to database");

  } catch (e) {
    console.error("Error in addTruckToOrg service:", e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Handles the business logic for updating a truck in an organization.
 * It verifies the user's permissions and ensures the truck exists before updating.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the truck resides.
 * @param truckId The ID of the truck to update.
 * @param truckData The full new data for the truck.
 * @returns A promise that resolves when the truck is successfully updated.
 * @throws {FirebaseVerifyError} If the user is not authorized, the truck does not exist, or IDs mismatch.
 */
export async function updateTruckInOrg(token: string, organizationId: string, truckId: string, truckData: Truck): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific truck document.
    const resourcePath = `organizations/${organizationId}/trucks/${truckId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Check if id of truck to update is the same as the updated truckId
    if (truckId !== truckData.truckId) {
      throw new FirebaseVerifyError(
        "Truck ID in URL does not match truck ID in request body.", 
        400 // Bad request
      );
    }

    // Check if truck exists to update
    if (!(await truckDatabase.truckExists(organizationId, truckId))) {
      throw new FirebaseVerifyError(
        `Truck with ID "${truckId}" not found in this organization.`, 
        404 // Not found
      );
    }

    // Update in database
    await truckDatabase.update(organizationId, truckId, truckData);

  } catch (e) {
    console.error("Error in updateTruckInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for deleting a truck from an organization.
 * It verifies the user's permissions and ensures the truck exists before deleting.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the truck resides.
 * @param truckId The ID of the truck to delete.
 * @returns A promise that resolves when the truck is successfully deleted.
 * @throws {FirebaseVerifyError} If the user is not authorized or the truck does not exist.
 */
export async function deleteTruckFromOrg(token: string, organizationId: string, truckId: string): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific truck document.
    // DELETE included within write for now
    const resourcePath = `organizations/${organizationId}/trucks/${truckId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Check if truck to delete exists
    if (!(await truckDatabase.truckExists(organizationId, truckId))) {
      throw new FirebaseVerifyError(
        `Truck with ID "${truckId}" not found in this organization.`, 
        404 // Not Found
      );
    }

    // Remove truck from database
    await truckDatabase.remove(organizationId, truckId);

  } catch (e) {
    console.error("Error in deleteTruckFromOrg service:", e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

// --- CalibrationChart Service Functions ---

/**
 * Handles the business logic for adding a new calibration chart to an organization.
 * It verifies the user's permissions and ensures the chart ID does not already exist.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization to add the chart to.
 * @param chartData The data for the new calibration chart.
 * @returns A promise that resolves when the chart is successfully created.
 * @throws {FirebaseVerifyError} If the user is not authorized or the chart ID already exists.
 */
export async function addChartToOrg(token: string, organizationId: string, chartData: CalibrationChart): Promise<void> {
  try {
    // Verify user has permission to WRITE to the calibrationCharts collection.
    const resourcePath = `organizations/${organizationId}/calibrationCharts`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if a chart with this ID already exists.
    if (await chartDatabase.exists(organizationId, chartData.chartId)) {
      throw new FirebaseVerifyError(
        `Chart with ID "${chartData.chartId}" already exists in this organization.`,
        409 // Conflict
      );
    }

    // Add to database
    await chartDatabase.add(organizationId, chartData);

  } catch (e) {
    console.error("Error in addChartToOrg service:", e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Handles the business logic for updating an existing calibration chart.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the chart resides.
 * @param chartId The ID of the chart to update.
 * @param chartData The full new data for the calibration chart.
 * @returns A promise that resolves when the chart is successfully updated.
 * @throws {FirebaseVerifyError} If the user is not authorized, the chart does not exist, or IDs mismatch.
 */
export async function updateChartInOrg(token: string, organizationId: string, chartId: string, chartData: CalibrationChart): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific chart document.
    const resourcePath = `organizations/${organizationId}/calibrationCharts/${chartId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Validate that the chartId in the URL matches the one in the body.
    if (chartId !== chartData.chartId) {
      throw new FirebaseVerifyError(
        "Chart ID in URL does not match chart ID in request body.", 
        400 // Bad Request
      );
    }

    // Ensure the chart actually exists before trying to update it.
    if (!(await chartDatabase.exists(organizationId, chartId))) {
      throw new FirebaseVerifyError(
        `Chart with ID "${chartId}" not found in this organization.`, 
        404 // Not Found
      );
    }

    // Update in database
    await chartDatabase.update(organizationId, chartId, chartData);

  } catch (e) {
    console.error("Error in updateChartInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for deleting a calibration chart from an organization.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the chart resides.
 * @param chartId The ID of the chart to delete.
 * @returns A promise that resolves when the chart is successfully deleted.
 * @throws {FirebaseVerifyError} If the user is not authorized, the chart does not exist, or the chart is in use.
 */
export async function deleteChartFromOrg(token: string, organizationId: string, chartId: string): Promise<void> {
  try {
    // Make sure user can WRITE to calibrationsCharts
    const resourcePath = `organizations/${organizationId}/calibrationCharts/${chartId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Ensure the chart exists before trying to delete it.
    if (!(await chartDatabase.exists(organizationId, chartId))) {
      throw new FirebaseVerifyError(
        `Chart with ID "${chartId}" not found in this organization.`, 
        404 // Not Found
      );
    }

    /**
     * @todo Not sure whether I want to check for this
     */
    // Check if any trucks use this chart
    // if (await truckDatabase.isChartInUse(organizationId, chartId)) {
    //   throw new FirebaseVerifyError(
    //     `Cannot delete chart "${chartId}" because it is currently assigned to one or more trucks.`,
    //     409 // Conflict
    //   );
    // }

    // Delete in database
    await chartDatabase.remove(organizationId, chartId);

  } catch (e) {
    console.error("Error in deleteChartFromOrg service:", e);
    throw e;
  }
}



// --- User Service Functions ---

/**
 * Handles the business logic for adding a user to the database, including organization sign-up validation.
 * @param userProfile The profile data for the user being added.
 * @throws An error if organization sign-up validation fails.
 */
export async function addUser(userProfile: UserProfile): Promise<void> {
  try {
    // Handle the specific logic for an organization sign-up
    if (userProfile.employeeId && userProfile.organizationId) {
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
