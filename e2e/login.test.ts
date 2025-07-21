import { signInWithEmailAndPassword } from "firebase/auth";
import { getAuth } from "firebase/auth"; 

import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { firebaseAuthService } from "@/api/firebase/firebaseAuthService"; 
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const SignUpApiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/signup`;

const loginApiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/login`;

const authClient = getAuth();


describe('Login API Route E2E Tests', () => {

    const validUser = {
      email: "validuser@test.com", // Make sure this is unique per test run/test block
      displayName: "validUser",
      password: "password123",
    };

    // At the top of your test file (outside any describe or test blocks)
    let validUserToken: string;
    let validUserUid: string; // To store the UID of the user whose token we are using

    // Common headers including the Authorization token
    let commonHeaders: { 'Content-Type': string; 'Authorization': string; };

    beforeEach( async () => {
        try {
            //Clear existing data
            await clearFirestoreAuth();
            await clearFirestoreDB();

            //Create valid user
            const newAuthUser = await adminAuth.createUser(validUser);
            validUserUid = newAuthUser.uid; // Store the UID for use in tests
            const currentTimeIso = new Date().toISOString();

            const userCredential = await signInWithEmailAndPassword(authClient, validUser.email, validUser.password);
            validUserToken = await userCredential.user.getIdToken(); // Store the ID token

            commonHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${validUserToken}`,
            };

            //Add user to database via api route
            const databaseResponse = await fetch(SignUpApiEndpoint, {
                method: 'POST',
                headers: commonHeaders,
                body: JSON.stringify({
                    email: validUser.email,
                    name: validUser.displayName,
                    uid: validUserUid, // Use the stored UID
                    createdAt: currentTimeIso
                }),
            });
            if (databaseResponse.status !== 200 && databaseResponse.status !== 201) {
                const errorBody = await databaseResponse.json();
                console.error("Error adding user to database in beforeEach:", errorBody);
                throw new Error(`Failed to add user to database in beforeEach: Status ${databaseResponse.status}`);
            }
            
        } catch(e) {
            console.error("Critical Error during beforeEach setup:", e);
            throw e;
        }
    });

    // This block runs once after all tests in this describe block have completed
    afterAll(async () => {
        try {
            // Clean up the emulators after all tests are done
            await clearFirestoreAuth();
            await clearFirestoreDB();
            // Terminate the admin app connection to allow Jest to exit cleanly
            await adminDb.terminate();
        } catch (e) {
            console.error("Error during afterAll cleanup:", e);
        }
    });

    // Test Case 1: Successful Login
    test('should successfully log in a user and set a secure session cookie', async () => {
        // 1. Call the login service with valid credentials
        const response = await firebaseAuthService.login.loginWithEmail({
            email: validUser.email,
            password: validUser.password,
        });

        // 2. Verify the API response is successful
        expect(response.status).toBe(200);
        const responseBody = await response.json();
        expect(responseBody.status).toBe('success');

        // 3. Verify the Set-Cookie header
        const setCookieHeader = response.headers.get('Set-Cookie');
        expect(setCookieHeader).toBeDefined();
        expect(setCookieHeader).not.toBeNull();

        // 4. Verify the cookie properties for security
        if (setCookieHeader) {
            expect(setCookieHeader).toContain('session-token=');
            expect(setCookieHeader.toLowerCase()).toContain('httponly');
            expect(setCookieHeader.toLowerCase()).toContain('path=/');
            expect(setCookieHeader.toLowerCase()).toContain('samesite=strict');
            // In production, you should also check for the 'secure' flag
            // expect(setCookieHeader.toLowerCase()).toContain('secure');
        }
    });

    // Test Case 2: Token is missing
    test('should respond with a fail when there is no token', async () => {
        // Call the API route directly without an Authorization header
        const response = await fetch(loginApiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Verify the response status and body
        expect(response.status).toBe(401);
        const responseBody = await response.json();
        expect(responseBody.status).toBe('fail');
        expect(responseBody.message).toBe('Authorization token required.');
    });

    // Test Case 3: Token is invalid
    test('should respond with an error when the token is invalid', async () => {
        // Call the API route directly with a deliberately invalid token
        const response = await fetch(loginApiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer this-is-not-a-valid-token',
            },
        });
        
        // Verify the response status and body
        expect(response.status).toBe(401);
        const responseBody = await response.json();
        expect(responseBody.status).toBe('error');
        expect(responseBody.message).toBe('Authentication failed');
    });
});
