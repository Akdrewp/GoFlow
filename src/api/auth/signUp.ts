
//Signing up on an individual account or through an organization
export enum SignupType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
}

//Individual accounts need a name, email, and password
export interface UserSignUpIndividual {
    name: string,
    email: string,
    password: string,
}

//Organization accounts need a name, email, password, organizationId, and employeeId
export interface UserSignUpOrganization {
    name: string,
    email: string,
    password: string,
    organizationId: string,
    employeeId: string,
}

export interface SignUpAuthService {
  /**
   * Handles the sign-up process for individual users.
   * @param formData - The data required for individual user registration.
   * @returns A Promise that resolves with Response when signup is successful, or rejects with an error.
   */
  signUpIndividual(formData: UserSignUpIndividual): Promise<Response>;

  /**
   * Handles the sign-up process for organization users.
   * @param formData - The data required for organization user registration.
   * @returns A Promise that resolves with Response when signup is successful, or rejects with an error.
   */
  signUpOrganization(formData: UserSignUpOrganization): Promise<Response>;
}