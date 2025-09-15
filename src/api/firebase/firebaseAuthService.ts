import { auth } from "./firebaseConfig";

// firebase/auth/firebaseAuthService.ts
import { AuthService, UserSignUpIndividual, UserSignUpOrganization, UserLogin } from '@/api/auth/authService';
import { UserProfile } from '@/api/database/database';


import {
  AuthError,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const databaseSignUpApiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/signup`;
const sessionLoginApiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/login`;


export const firebaseAuthService: AuthService = {
  login: {
    /**
     * Handles the login process for a user with email and password.
     * logs user in via firebase then sets token as cookie under "session-cooke"
     * @param formData - The data required for user login.
     * @returns A Promise that resolves with a Response when login is successful, or rejects with an error.
     */
    loginWithEmail: async (formData: UserLogin): Promise<Response> => {
      try {
        // 1. Sign in the user with Firebase Client SDK
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        
        if (userCredential.user) {
          // 2. Get the ID token from the signed-in user
          const idToken = await userCredential.user.getIdToken();

          // 3. Send the token to the API route to create a session cookie
          const sessionResponse = await fetch(sessionLoginApiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
          });

          if (!sessionResponse.ok) {
            throw new Error('Failed to create session.');
          }

          console.log("Session cookie set successfully.");
          return sessionResponse;
        } else {
          throw new Error("Login failed: No user object returned from Firebase.");
        }
      } catch (e) {
        console.error("Firebase loginWithEmail ERROR (client-side):", e);
        // Handle specific Firebase auth errors
        if (e && typeof e === 'object' && 'code' in e) {
          const firebaseError = e as AuthError;
          switch (firebaseError.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
              throw new Error('Invalid email or password.');
            case 'auth/invalid-email':
              throw new Error('The email address is not valid.');
            default:
              throw new Error(`Login failed: ${firebaseError.message}`);
          }
        } else { //Unkown error type
            throw new Error(`An unexpected error occurred during login: ${(e as Error).message}`);
        }
      }
    }, // <-- Corrected function syntax and added comma
  }, // <-- Added comma
  signUp: {
    /**
     * Handles the sign-up process for individual users.
     * @param formData - The data required for individual user registration.
     * @returns A Promise that resolves with a Response when signup is successful, or rejects with an error.
     */
    signUpIndividual: async (formData: UserSignUpIndividual): Promise<Response> => {
      try {
        
        //Create new user via admin auth
        const response: UserCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

        if (response.user) {
          console.log("Firebase Auth User created (client-side):", response.user.uid);

          const userProfile: UserProfile = {
            uid: response.user.uid,
            name: formData.name,
            email: formData.email,
            createdAt: new Date(),
          };
          const idToken = await auth.currentUser?.getIdToken();

          //Have endpoint add user to database along with requisite fields
          const databaseResponse = await fetch(databaseSignUpApiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify(userProfile),
          });

          console.log("Database response (from client-side service): ", await databaseResponse.clone().json());
          return databaseResponse;
        } else {
          console.error("Firebase sign up failed: No user object in response after creation.");
          throw new Error("User creation failed: No user information received from firebase Auth.");
        }
      } catch (e) {
        console.error("Firebase signUpIndividual ERROR (client-side):", e);
        if (e && typeof e === 'object' && 'code' in e) {
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
     * @returns A Promise that resolves with a Response when signup is successful, or rejects with an error.
     */
    signUpOrganization: async (formData: UserSignUpOrganization): Promise<Response> => {
      try {

        // Add user to firebase auth
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
        
        // Need idToken to call /auth/signUp
        const idToken = await auth.currentUser?.getIdToken();

        // Add user to database
        const databaseResponse = await fetch(databaseSignUpApiEndpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(userProfile),
        });

        console.log("Database response (from client-side service for organization): ", await databaseResponse.clone().json());
        return databaseResponse;

      } catch (e) {
        console.error("Firebase signUpOrganization ERROR (client-side):", e);
        if (e && typeof e === 'object' && 'code' in e) {
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
  }
};
