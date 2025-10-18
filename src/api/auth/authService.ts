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

//Organization accounts need a name, email, password, organizationId, and employeeId
export interface UserSignUp {
    name: string,
    email: string,
    password: string,
    organizationId?: string,
    employeeId?: string,
}

export interface UserLogin {
  email: string,
  password: string,
}

export interface AuthService {
  /**
   * Handles user login operations.
   */
  login: {
    /**
     * Handles the login process for a user with email and password.
     * @param formData - The data required for user login.
     * @returns A Promise that resolves with a Response when login is successful, or rejects with an error.
     */
    loginWithEmail(formData: UserLogin): Promise<Response>;
  };

  /**
   * Handles user sign-up operations.
   */
  signUp: {
    /**
     * Handles the sign-up process for organization users.
     * @param formData - The data required for organization user registration.
     * @returns A Promise that resolves with a Response when signup is successful, or rejects with an error.
     */
    signUpUser(formData: UserSignUp): Promise<Response>;
  };

  /**
   * Handles user account deletion.
   */
  delete: {
    /**
     * Deletes user in Firebase Auth and in database
     * @returns A promise that resolves when the account is deleted.
     */
    deleteAccount(): Promise<void>;
  }
}

