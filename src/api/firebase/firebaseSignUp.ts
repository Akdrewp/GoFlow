// firebase/auth/firebaseAuthService.ts
import { getAuth, createUserWithEmailAndPassword, UserCredential, AuthError } from "firebase/auth";
import { SignUpAuthService, UserSignUpIndividual, UserSignUpOrganization } from '@/api/auth/signUp';
import { UserProfile, Organization } from '@/api/database/database';
import { firebaseDatabase } from '@/api/firebase/firestoreDatabase'

const auth = getAuth();

// Export an object that adheres to the ISignUpAuthService interface
export const firebaseAuthService: SignUpAuthService = {
    /**
     * Handles the sign-up process for individual users using Firebase Authentication.
     * ... (JSDoc as before) ...
     */
    signUpIndividual: async (formData: UserSignUpIndividual): Promise<void> => {
        try {
            const response: UserCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            if (response.user) {
                console.log("Firebase Auth User created:", response.user.uid);

                const userProfile: UserProfile = {
                    uid: response.user.uid,
                    name: formData.name,
                    email: formData.email,
                    createdAt: new Date(),
                };
                await firebaseDatabase.addUserToDatabase(userProfile); // Use the imported firebaseDatabase

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
     * Handles the sign-up process for organization users using Firebase Authentication.
     * ... (JSDoc as before) ...
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

            const organizationData: Organization = {
                uid: formData.organizationId, // Using organizationId as the primary UID for the org doc
                organizationId: formData.organizationId,
                name: formData.name, // Placeholder, adjust as per your org creation flow
                email: formData.email, // Placeholder, adjust as per your org creation flow
                createdBy: userResponse.user.uid,
                createdAt: new Date(),
            };
            await firebaseDatabase.addOrganizationToDatabase(organizationData);

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