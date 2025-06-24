// firebase/auth/firebaseAuthService.ts
import { getAuth, createUserWithEmailAndPassword, UserCredential, AuthError } from "firebase/auth";
import { SignUpAuthService, UserSignUpIndividual, UserSignUpOrganization } from '@/api/auth/signUp';
import { UserProfile } from '@/api/database/database';
import { firebaseDatabase } from '@/api/firebase/firestoreDatabase';

const auth = getAuth();

// Export an object that adheres to the ISignUpAuthService interface
export const firebaseAuthService: SignUpAuthService = {
    /**
   * Handles the sign-up process for individual users.
   * @param formData - The data required for individual user registration.
   * @returns A Promise that resolves when signup is successful, or rejects with an error.
   */
    signUpIndividual: async (formData: UserSignUpIndividual): Promise<void> => {
        try {

            //createUserWithEmailAndPassword already checks for duplicate UID
            const response: UserCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            if (response.user) {
                console.log("Firebase Auth User created:", response.user.uid);

                const userProfile: UserProfile = {
                    uid: response.user.uid,
                    name: formData.name,
                    email: formData.email,
                    createdAt: new Date(),
                };

                const databaseResponse = await fetch("/api/auth/signup", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // <--- IMPORTANT: Tell the server you're sending JSON
                    },
                    body: JSON.stringify(userProfile), // <--- IMPORTANT: Convert your object to a JSON string
                });

                console.log(databaseResponse);

                return;
            } else {
                console.error("Firebase sign up failed: No user object in response after creation.");
                throw new Error("User creation failed: No user information received.");
            }
        } catch (e) {
            console.error("Firebase signUpIndividual ERROR:", e);
            if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
                const firebaseError = e as AuthError;
                switch (firebaseError.code) {
                    case 'auth/email-already-in-use':
                        throw new Error('This email address is already registered. Please sign in or use a different email.');
                    case 'auth/weak-password':
                        throw new Error('The password is too weak. It must be at least 6 characters long.');
                    case 'auth/invalid-email':
                        throw new Error('The email address is invalid.');
                    case 'auth/operation-not-allowed':
                        throw new Error('Email/password sign-in is not enabled. Please contact support.');
                    default:
                        throw new Error(`Authentication failed: ${firebaseError.message}`);
                }
            } else {
                throw new Error(`An unexpected error occurred during sign up: ${(e as Error).message || 'Unknown error'}`);
            }
        }
    },

    /**
   * Handles the sign-up process for organization users.
   * @param formData - The data required for organization user registration.
   * @returns A Promise that resolves when signup is successful, or rejects with an error.
   */
    signUpOrganization: async (formData: UserSignUpOrganization): Promise<void> => {
        try {
            const userResponse: UserCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            if (!userResponse.user) {
                console.error("Firebase sign up failed for organization user: No user object in response.");
                throw new Error("Organization user creation failed: No user information received.");
            }

            console.log("Firebase Auth Organization User created:", userResponse.user.uid);

            const userProfile: UserProfile = {
                uid: userResponse.user.uid,
                name: formData.name,
                email: formData.email,
                organizationId: formData.organizationId,
                employeeId: formData.employeeId,
                createdAt: new Date(),
            };
            await firebaseDatabase.addUserToDatabase(userProfile);

            return;
        } catch (e) {
            console.error("Firebase signUpOrganization ERROR:", e);
            if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
                const firebaseError = e as AuthError;
                switch (firebaseError.code) {
                    case 'auth/email-already-in-use':
                        throw new Error('This email address is already registered for an organization. Please sign in or use a different email.');
                    case 'auth/weak-password':
                        throw new Error('The password is too weak. It must be at least 6 characters long.');
                    case 'auth/invalid-email':
                        throw new Error('The email address is invalid.');
                    case 'auth/operation-not-allowed':
                        throw new Error('Email/password sign-in is not enabled. Please contact support.');
                    default:
                        throw new Error(`Authentication failed for organization: ${firebaseError.message}`);
                }
            } else {
                throw new Error(`An unexpected error occurred during organization sign up: ${(e as Error).message || 'Unknown error'}`);
            }
        }
    },
};