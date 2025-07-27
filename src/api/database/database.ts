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
    createdAt: Date,
    organizationId: string,
    createdBy: string,
}

//Employee's are added before they signup
//Before an employee signs up status is inactive
//signifying the employee hasn't signed up yet
/**
 * @todo Create enums for status and role
 * Not sure what the status and roles should be
 */
export interface Employee {
    name: string,
    email: string,
    role: string,
    status: string,
    employeeId?: string,
    uid?: string,
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
  createdAt: z.coerce.date(),
  organizationId: z.string(),
  createdBy: z.string()
});

export interface Database {
    user: {
        /**
         * Adds or updates a user's profile information in the 'users' collection.
         * @param userProfile - The user's profile data.
         * @returns A Promise that resolves when the operation is complete.
         */
        add(userProfile: UserProfile): Promise<void>;

        /**
         * Fetches a user's profile from the 'users' collection by their UID.
         * @param uid - The user's Firebase Auth UID.
         * @returns A Promise resolving to the UserProfile if found, otherwise null.
         */
        get(uid: string): Promise<UserProfile | null>;
    };

    organization: {
        /**
         * Handles adding a new organization's details to the database.
         * @param organization - The organization's data.
         * @returns A Promise that resolves when the operation is complete.
         */
        add(organization: Organization): Promise<void>;

        /**
         * Checks if an organization with the given ID exists.
         * @param organizationId - The ID of the organization to check.
         * @returns A Promise resolving to true if the organization exists, false otherwise.
         */
        exists(organizationId: string): Promise<boolean>;
    };
    
    employee: {
        /**
         * Checks if an employeeId is valid for a given organization.
         * @param organizationId - The ID of the organization.
         * @param employeeId - The employee ID to validate.
         * @returns A Promise resolving to true if the employeeId is valid, false otherwise.
         */
        existsInOrg(organizationId: string, employeeId: string): Promise<boolean>;

        /**
         * Checks if an employeeId is already associated with an existing user profile.
         * @param employeeId - The employee ID to check.
         * @returns A Promise resolving to true if a user with this employeeId already exists, false otherwise.
         */
        isAssociated(employeeId: string): Promise<boolean>;
    };
}
