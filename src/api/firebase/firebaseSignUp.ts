// firebase/auth/firebaseAuthService.ts
import { getAuth, createUserWithEmailAndPassword, UserCredential, AuthError } from "firebase/auth";
import { SignUpAuthService, UserSignUpIndividual, UserSignUpOrganization } from '@/api/auth/signUp';
import { UserProfile } from '@/api/database/database';

const auth = getAuth(); // Client-side Auth instance

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const firebaseAuthService: SignUpAuthService = {
    /**
     * Handles the sign-up process for individual users.
     * @param formData - The data required for individual user registration.
     * @returns A Promise that resolves with the `Response` object from the API call upon successful signup, or rejects with an error.
     */
    signUpIndividual: async (formData: UserSignUpIndividual): Promise<Response> => { // <--- CHANGE RETURN TYPE
        try {
            // createUserWithEmailAndPassword already checks for duplicate UID
            const response: UserCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            if (response.user) {
                console.log("Firebase Auth User created (client-side):", response.user.uid);

                const userProfile: UserProfile = {
                    uid: response.user.uid,
                    name: formData.name,
                    email: formData.email,
                    createdAt: new Date(),
                };

                const apiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/signup`;

                const databaseResponse = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userProfile),
                });

                // Use .clone() if you need to read the body more than once (e.g., for logging AND returning)
                console.log("Database response (from client-side service): ", await databaseResponse.clone().json());

                return databaseResponse; // <--- RETURN THE FETCH RESPONSE OBJECT
            } else {
                console.error("Firebase sign up failed: No user object in response after creation.");
                throw new Error("User creation failed: No user information received.");
            }
        } catch (e) {
            console.error("Firebase signUpIndividual ERROR (client-side):", e);
            // Re-throw specific errors as before
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

    // ... signUpOrganization (consider similar return type change) ...
    signUpOrganization: async (formData: UserSignUpOrganization): Promise<Response> => { // <--- Change return type
        try {
            const userResponse: UserCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            if (!userResponse.user) {
                console.error("Firebase sign up failed for organization user: No user object in response.");
                throw new Error("Organization user creation failed: No user information received.");
            }

            console.log("Firebase Auth Organization User created (client-side):", userResponse.user.uid);

            const userProfile: UserProfile = {
                uid: userResponse.user.uid,
                name: formData.name,
                email: formData.email,
                organizationId: formData.organizationId,
                employeeId: formData.employeeId,
                createdAt: new Date(),
            };
            // Assuming this addUserToDatabase is for a direct Firestore client-side write
            // If it's *also* calling the API route, then this logic needs careful review.
            // For now, if you want it to trigger the /api/auth/signup route, you would do a fetch here.
            // But if this is a separate path that bypasses the API route, you need to be aware of security implications.
            // For E2E, we're assuming signUpIndividual triggers the API.
            // await firebaseDatabase.addUserToDatabase(userProfile); // This is likely client-side Firestore

            const apiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/signup`;

            // To mimic the individual signup flow (API route for database ops)
            const databaseResponse = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userProfile),
            });

            console.log("Database response (from client-side service for organization): ", await databaseResponse.clone().json());
            return databaseResponse; // <--- RETURN THE FETCH RESPONSE OBJECT

        } catch (e) {
            console.error("Firebase signUpOrganization ERROR (client-side):", e);
            // ... (error handling) ...
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