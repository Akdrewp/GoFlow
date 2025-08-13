import { DocumentData } from "firebase-admin/firestore";

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
    role: string,
    status: string,
    employeeId: string,
    email?: string,
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

export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  status: z.enum(["invited", "active"]),
  employeeId: z.string().min(1, "Employee ID is required"),
  email: z.string().email().optional(),
  uid: z.string().optional(),
});

export interface Database {
    user: {
        /**
         * Adds or updates a user's profile information in the 'users' collection.
         * @param userProfile - The user's profile data.
         * @returns A Promise that resolves when the operation is complete.
         * @throws Error if userProfile includes orgnaizationId and employeeId
         * but orgnization does not exist, employee does not exist, or
         * employee already has an associated account.
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

        /**
         * Adds employee with specified data to organization with organizationId
         * @param organizationId The organizationId of the organization to add employee to
         * @param employeeData Employee data
         * @returns A Promise resolving to true if the employee was added
         * @throws Error if employee could not be added
         */
        addEmployee(organizationId: string, employeeData: Employee): Promise<void>;
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

        /**
         * Updates an existing employee record to link a Firebase Auth UID
         * and set their status to "active".
         * @param organizationId The ID of the organization.
         * @param employeeId The ID of the employee document.
         * @param uid The Firebase Auth UID of the user to link.
         */
        activate(organizationId: string, employeeId: string, uid: string): Promise<void>
    };

    generic: {
        /**
         * Fetches any document from the database by its full path.
         * @param resourceId - The full path to the document (e.g., "users/uid123").
         * @returns A Promise resolving to the document's data if found
         * @throws Error if data is not found
         */
        get(resourceId: string): Promise<DocumentData>;

        /**
         * Updates a document with the provided data after validating it against a schema.
         * @param resourceId - The full path to the document to update.
         * @param data - The data to update the document with.
         * @param schema - The Zod schema to validate the data against.
         * @returns A Promise that resolves when the update is complete.
         */
        update<T extends z.ZodTypeAny>(resourceId: string, data: z.infer<T>, schema: T): Promise<void>;
    };
}
