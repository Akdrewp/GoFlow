export enum SignupType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
  // You can keep 'null' as the initial state in your component's useState,
  // or add it here if you prefer a stricter enum-based initial state.
  // For `useState(null)`, it's common to treat null as "no selection yet".
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

/**
 * Defines the contract for any authentication service related to sign-up.
 * Any class that implements this interface must provide concrete
 * implementations for the signUpIndividual and signUpOrganization methods.
 */
export interface SignUpAuthService {
  /**
   * Handles the sign-up process for individual users.
   * @param formData - The data required for individual user registration.
   * @returns A Promise that resolves when signup is successful, or rejects with an error.
   */
  signUpIndividual(formData: UserSignUpIndividual): Promise<void>;

  /**
   * Handles the sign-up process for organization users.
   * @param formData - The data required for organization user registration.
   * @returns A Promise that resolves when signup is successful, or rejects with an error.
   */
  signUpOrganization(formData: UserSignUpOrganization): Promise<void>;
}