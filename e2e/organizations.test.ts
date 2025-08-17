import { signInWithEmailAndPassword } from "firebase/auth";
import { getAuth } from "firebase/auth"; 

import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";

//Api endpoints used for testing
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const organizationsCreateEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/organizations`;
const SignUpApiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/signup`;

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

  // Test Case 1: Successful Organization Creation
  test('should successfully create a new organization with a valid session token', async () => {
    const orgData = {
      name: "Test Corp",
      email: "contact@testcorp.com",
      organizationId: "TESTCORP123"
    };
    
    // 1. Make the API call, manually setting the Cookie header
    const response = await fetch(organizationsCreateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${validUserToken}`
      },
      body: JSON.stringify(orgData),
    });

    // 2. Assert the API response is successful
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('success');
    expect(responseBody.message).toBe('Organization added to database');
    expect(responseBody.data.organizationId).toBe(orgData.organizationId);

    // 3. Verify the data was actually written to Firestore
    const orgDoc = await adminDb.collection('organizations').doc(orgData.organizationId).get();
    expect(orgDoc.exists).toBe(true);
    expect(orgDoc.data()?.name).toBe(orgData.name);
  });

  // Test Case 2: Attempt to create an organization without a token
  test('should fail with a 401 Unauthorized error if no cookie is provided', async () => {
    const orgData = {
      name: "No Auth Corp",
      email: "no@auth.com",
      organizationId: "NOAUTH123"
    };

    // Make the API call without the Cookie header
    const response = await fetch(organizationsCreateEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orgData),
    });
    
    // Assert the API correctly rejects the request
    expect(response.status).toBe(401);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('Authentication required.');
  });

  // Test Case 3: Invalid Input (Zod Validation Failure)
  test('should fail with a 400 Bad Request if the input data is invalid', async () => {
    // Missing 'name' field, which should be caught by the Zod schema
    const invalidOrgData = {
      email: "contact@invalidcorp.com",
      organizationId: "INVALIDCORP123"
    };

    const response = await fetch(organizationsCreateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${validUserToken}`
      },
      body: JSON.stringify(invalidOrgData),
    });

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('fail');
    expect(responseBody.message).toBeDefined(); // Zod error object should be in the message
  });

  // Test Case 4: Business Logic Conflict (Organization Already Exists)
  test('should fail with a 409 Conflict error if the organization ID already exists', async () => {
    const orgData = {
      name: "Conflict Corp",
      email: "contact@conflictcorp.com",
      organizationId: "CONFLICT123"
    };

    // First, successfully create the organization
    const initialResponse = await fetch(organizationsCreateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${validUserToken}`
      },
      body: JSON.stringify(orgData),
    });
    expect(initialResponse.status).toBe(201); // Ensure the first one was created

    // Now, try to create it again with the same ID
    const conflictResponse = await fetch(organizationsCreateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${validUserToken}`
      },
      body: JSON.stringify(orgData),
    });

    expect(conflictResponse.status).toBe(409);
    const responseBody = await conflictResponse.json();
    expect(responseBody.status).toBe('fail');
    expect(responseBody.message).toBe('Organization with passed organizationId already exists');
  });
});
