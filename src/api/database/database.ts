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
    organizationId?: string,
    createdBy: string,
}

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

}