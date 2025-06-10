export interface UserProfile {
    name: string,
    email: string,
    uid: string,
    organizationId?: string,
    employeeId?: string,
}

export interface Organization {
    name: string,
    email: string,
    uid: string,
    organizationId?: string,
    createdBy: string,
}

export interface Database {

    //Handles adding user
    addUserToDatabase(userProfile: UserProfile): Promise<void>;

    addOrganizationToDatabase(organization: Organization): Promise<void>;

}