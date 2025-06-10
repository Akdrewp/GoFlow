import { getAuth, createUserWithEmailAndPassword, UserCredential, AuthError } from "firebase/auth";

import { UserSignUpIndividual, UserSignUpOrganization } from '@/Api/SignUp/signUp';

const auth = getAuth();

export class fireBaseSignUp {
    async signUpIndividual(formData: UserSignUpIndividual): Promise<void> {
        try {
            const response: UserCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            // if successful. The 'response' itself signifies success.
            if (response.user) { // Check if user object exists in the response
                console.log("User created:", response.user); /** @todo LOG FOR DEBUGGING */

                //Add user to firestore database

                return; // Resolves the Promise<void> successfully
            } else {
                console.error("Firebase sign up failed: No user object in response.");
                throw new Error("User creation failed: No user information received.");
            }
        } catch (e) { // Explicitly type 'e' as 'any' or 'AuthError' for better handling
            console.error("Create user with email and password ERROR:", e);

            // Determine if it's a Firebase Auth error to provide specific messages
            if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
                const firebaseError = e as AuthError;
                throw new Error(`Authentication failed: ${firebaseError.message}`);
            } else {
                // Non-Firebase errors
                throw new Error(`An unexpected error occurred during sign up: ${(e as Error).message || 'Unknown error'}`);
            }
        }
    }
    /**@TODO */
    async signUpOrganization(formData: UserSignUpOrganization): Promise<void> {
        /**@TODO Need to figure out create organization first*/
    }




}