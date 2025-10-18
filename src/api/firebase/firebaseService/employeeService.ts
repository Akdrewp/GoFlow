import { Employee } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError } from "../firebaseVerify";
import { employeeDatabase, organizationDatabase, assignmentDatabase, userDatabase, roleDatabase } from "../firestoreDatabase";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Add employee to organization setting status as "invited"
 * @param token The admin/manager's Firebase ID token.
 * @param organizationId The ID of the organization to add the employee to.
 * @param employeeData The data for the new employee.
 * @throws An error if permissions are insufficient or if the employee/role validation fails.
 */
export async function addEmployeeToOrg(token: string, organizationId: string, employeeData: Omit<Employee, "status">): Promise<void> {
  try {
    // Verify user has permission to write to the employees collection
    await canUserAccessData(token, `organizations/${organizationId}/employees`, AccessType.WRITE);

    // Check for duplicate employee ID
    if (await employeeDatabase.exists(organizationId, employeeData.employeeId)) {
      throw new FirebaseVerifyError(
        "Employee with passed employeeId already exists",
        409 // Conflict
      );
    }
    
    // Check if the assigned role exists
    if (!(await roleDatabase.exists(organizationId, employeeData.roleId))) {
      throw new FirebaseVerifyError(
        `Role with ID "${employeeData.roleId}" does not exist in this organization.`,
        400 // Bad request
      );
    }

    const invitedEmployeeData: Employee = {
      ...employeeData,
      status: "invited",
    };
    
    // Add the employee via the database repository
    await employeeDatabase.add(organizationId, employeeData.employeeId, invitedEmployeeData);
  } catch (e) {
    console.error("Error adding employee to organization:", e);
    throw e;
  }
}

/**
 * Fetches a specific employee's data from an organization.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization.
 * @param employeeId The ID of the employee to fetch.
 * @returns A promise resolving to the Employee object.
 * @throws {FirebaseVerifyError} If the user is not authorized or the employee does not exist.
 */
export async function getEmployeeFromOrg(token: string, organizationId: string, employeeId: string): Promise<Employee> {
    try {
        const resourcePath = `organizations/${organizationId}/employees/${employeeId}`;
        await canUserAccessData(token, resourcePath, AccessType.READ);

        // The repository's get function will throw a 404 if not found.
        return await employeeDatabase.get(organizationId, employeeId);
    } catch (e) {
        console.error("Error in getEmployeeFromOrg service:", e);
        throw e;
    }
}

/**
 * Handles the business logic for updating an existing employee's details.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param employeeId The ID of the employee to update.
 * @param employeeData The partial data to update on the employee's record.
 * @throws {FirebaseVerifyError} If permissions are insufficient or data is invalid.
 */
export async function updateEmployeeInOrg(token: string, organizationId: string, employeeId: string, employeeData: Partial<Employee>): Promise<void> {
    try {
        const resourcePath = `organizations/${organizationId}/employees/${employeeId}`;
        await canUserAccessData(token, resourcePath, AccessType.WRITE);

        // Business Logic: If the role is being changed, verify the new role exists.
        if (employeeData.roleId && !(await roleDatabase.exists(organizationId, employeeData.roleId))) {
            throw new FirebaseVerifyError(
              `Role with ID "${employeeData.roleId}" does not exist.`, 
              404 // Not Found
            );
        }

        await employeeDatabase.update(organizationId, employeeId, employeeData);
    } catch (e) {
        console.error("Error in updateEmployeeInOrg service:", e);
        throw e;
    }
}

/**
 * Handles the business logic for deleting an employee from an organization.
 * Prevents deletion if the employee has an active assignment.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param employeeId The ID of the employee to delete.
 * @throws {FirebaseVerifyError} If permissions are insufficient or validation fails.
 */
export async function deleteEmployeeFromOrg(token: string, organizationId: string, employeeId: string): Promise<void> {
    try {
        const resourcePath = `organizations/${organizationId}/employees/${employeeId}`;
        await canUserAccessData(token, resourcePath, AccessType.WRITE);

        const employee = await organizationDatabase.getEmployee(organizationId, employeeId);
        // If employee has an active account
        if (employee.uid) {
          // Prevent deleting an employee who has an active assignment
          const employeeAssignment = await assignmentDatabase.getFromUser(organizationId, employee.uid);
          if (employeeAssignment) {
              throw new FirebaseVerifyError(
                  "Cannot delete employee because they have an active truck assignment. Please unassign them first.",
                  409 // Conflict
              );
          }

          // Remove organizationId and employeeId from user profile
          const updatedProfileData = {
            type: "individual",
            organizationId: FieldValue.delete(),
            employeeId: FieldValue.delete(),
          } as const;
          await userDatabase.update(employee.uid, updatedProfileData);
          
        } else { // No active account safe to delete
          await employeeDatabase.remove(organizationId, employeeId);
        }

    } catch (e) {
        console.error("Error in deleteEmployeeFromOrg service:", e);
        throw e;
    }
}
