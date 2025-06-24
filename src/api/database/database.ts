export interface UserProfile {
    name: string,
    email: string,
    uid: string,
    createdAt: Date,
    organizationId?: string,
    employeeId?: string,
}

export interface Organization {
    name: string,
    email: string,
    uid: string,
    createdAt: Date,
    organizationId: string,
    createdBy: string,
}

import { z } from "zod";

export const userProfileSchema = z.object({
  name: z.string(),
  email: z.string(),
  uid: z.string(),
  createdAt: z.coerce.date(),
  organizationId: z.string().optional(),
  employeeId: z.string().optional()
});

export const organizationSchema = z.object({
  name: z.string(),
  email: z.string(),
  uid: z.string(),
  createdAt: z.coerce.date(),
  organizationId: z.string(),
  createdBy: z.string()
});

export interface Database {

    /**
     * Handles adding a user's profile information to the database.
     * This method is typically called after a user has successfully authenticated
     * (e.g., via Firebase Auth) to store additional user-specific data.
     *
     * @param userProfile - An object containing the user's profile data,
     * including name, email, Firebase Auth UID,
     * and optionally organizationId and employeeId if
     * they are part of an organization.
     * @returns A Promise that resolves when the user profile has been
     * successfully added to the database. The Promise rejects
     * if an error occurs during the database operation.
     */
    addUserToDatabase(userProfile: UserProfile): Promise<void>;

    /**
     * Handles adding a new organization's details to the database.
     * This method is typically called when a new organization is created
     * within the application.
     *
     * @param organization - An object containing the organization's data,
     * including its name, email, a unique identifier (UID or custom organizationId),
     * and the Firebase Auth UID of the user who created it.
     * @returns A Promise that resolves when the organization data has been
     * successfully added to the database. The Promise rejects
     * if an error occurs during the database operation.
     */
    addOrganizationToDatabase(organization: Organization): Promise<void>;


    /**
     * Checks if an organization with the given ID exists.
     * @param organizationId The ID of the organization to check.
     * @returns A Promise resolving to true if the organization exists, false otherwise.
     */
    organizationExists(organizationId: string): Promise<boolean>;

    /**
     * Checks if an employeeId is valid for a given organization and not yet "consumed".
     * This logic is highly dependent on your data model for employee IDs within organizations.
     * For example, it might check if `organization/orgId/employees/{employeeId}` document exists
     * or if a field like `availableEmployeeIds` in the organization document contains it.
     *
     * @param organizationId The ID of the organization.
     * @param employeeId The employee ID to validate.
     * @returns A Promise resolving to true if the employeeId is valid for the organization, false otherwise.
     */
    employeeIdExistsInOrganization(organizationId: string, employeeId: string): Promise<boolean>

    /**
     * Checks if an employeeId is already associated with an existing user profile.
     * Assumes UserProfile documents have an 'employeeId' field.
     * @param employeeId The employee ID to check.
     * @returns A Promise resolving to true if a user with this employeeId already exists, false otherwise.
     */
    isEmployeeIdAlreadyAssociatedWithUser(employeeId: string): Promise<boolean>
}