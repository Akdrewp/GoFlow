import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getAuth } from "firebase/auth"; 

import { firebaseAuthService } from "@/api/firebase/firebaseAuthService";
import { clearFireStore, clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const apiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/signup`;

const authClient = getAuth();

describe('Signup API Route E2E Tests', () => {

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
      // Clear existing data
      await clearFirestoreAuth();
      await clearFirestoreDB();

      // Create valid user
      const newAuthUser = await adminAuth.createUser(validUser);
      validUserUid = newAuthUser.uid; // Store the UID for use in tests
      const currentTimeIso = new Date().toISOString();

      const userCredential = await signInWithEmailAndPassword(authClient,validUser.email,validUser.password);
      validUserToken = await userCredential.user.getIdToken();

      commonHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validUserToken}`,
      };

      //Add user to database via api route
      const databaseResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({
          type: "individual",
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
  
  afterAll(async () => {
    await clearFireStore();
  });


  // Test Case 1: Successful Signup
  test('should successfully sign up a new individual user and verify in Auth and Firestore', async () => {
    const testName = 'New User E2E';
    const testEmail = 'e2e.test.individual@example.com';
    const testPassword = 'securePassword123';

    // Create user via POST api
    const apiResponse = await firebaseAuthService.signUp.signUpUser({
      name: testName,
      email: testEmail,
      password: testPassword
    });

    // Parse the JSON response from your API route
    const apiResponseData = await apiResponse.json();

    // Verify response is success
    expect(apiResponse.status).toBe(201);
    expect(apiResponseData.status).toBe('success');
    expect(apiResponseData.message).toBe('User account succesfully added to database');

    // Verify response data matches sent data
    expect(apiResponseData.data).toHaveProperty('uid'); // API should return the UID from Auth
    expect(apiResponseData.data.name).toBe(testName);
    expect(apiResponseData.data.email).toBe(testEmail);

    const createdUid = apiResponseData.data.uid; // Get UID from the API response

    // Verify User existence and details in Firebase Authentication Emulator (using Admin SDK)
    let authUserRecord;
    try {
      authUserRecord = await adminAuth.getUser(createdUid);
    } catch (e) {
      fail(`Failed to retrieve user from Firebase Auth emulator: ${(e as Error).message}`);
    }
    expect(authUserRecord).toBeDefined();
    expect(authUserRecord.email).toBe(testEmail);
    // If you set displayName in Auth creation, check it:
    // expect(authUserRecord.displayName).toBe(testName);
    expect(authUserRecord.uid).toBe(createdUid);

    // Verify User Profile existence and data in Firestore Emulator (using Admin SDK)
    const userDocRef = adminDb.collection('users').doc(createdUid);
    const userDocSnap = await userDocRef.get();

    expect(userDocSnap.exists).toBe(true);
    const firestoreData = userDocSnap.data();
    console.log("FIRESTORE DATA CONSOLE LOG TEST 1: ",firestoreData);

    expect(firestoreData).toBeDefined();
    expect(firestoreData?.name).toBe(testName);
    expect(firestoreData?.email).toBe(testEmail);
    expect(firestoreData?.uid).toBe(createdUid);
    expect(firestoreData?.type).toBe("individual");

    //Check whether createdAt is a date
    const createdAtDate = new Date(firestoreData?.createdAt).getDate();
    expect(!isNaN(createdAtDate));
    
    //Check whether date is in the past
    expect(createdAtDate).toBeLessThanOrEqual(new Date().getTime());

    // Also check for absence of optional fields if not provided
    expect(firestoreData).not.toHaveProperty('organizationId');
    expect(firestoreData).not.toHaveProperty('employeeId');

  });

  // Test Case 2: Invalid form data passed to signup route
  test('should reject any invalid schema data to /api/auth/signup', async () => {
    const currentTimeIso = new Date().toISOString(); // Consistent valid date string

    // Common headers including the Authorization token
    const commonHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validUserToken}`, // <-- Adding the ID token here
    };

    // --- Original: Missing Email ---
    const missingEmailData = {
      name: "test_name",
      uid: validUserUid, // <-- Use the valid UID from the authenticated user
      createdAt: currentTimeIso,
    };
    const missingEmailApiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: commonHeaders, // <-- Using common headers with token
      body: JSON.stringify(missingEmailData),
    });
    // Expect 400 if your schema validation correctly catches missing email after token verification
    expect(missingEmailApiResponse.status).toBe(400);


    // --- Missing Name ---
    const missingNameData = {
      email: "missing.name.with.auth@example.com", // Unique email for this scenario
      uid: validUserUid, // <-- Use the valid UID
      createdAt: currentTimeIso,
    };
    const missingNameApiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: commonHeaders, // <-- Using common headers with token
      body: JSON.stringify(missingNameData),
    });
    expect(missingNameApiResponse.status).toBe(400);


    // --- Missing UID ---
    // NOTE: This scenario is tricky. If your backend strictly compares
    // 'uid' from the token to 'uid' from the body *before* general schema
    // validation (and returns 404/403 on mismatch/absence), this might
    // yield a 404/403 instead of a 400. This test assumes your schema validation
    // runs and correctly identifies 'uid' as missing for a 400.
    const missingUidData = {
      name: "test_name",
      email: "missing.uid.with.auth@example.com", // Unique email for this scenario
      // uid is intentionally missing here
      createdAt: currentTimeIso,
    };
    const missingUidApiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: commonHeaders, // <-- Using common headers with token
      body: JSON.stringify(missingUidData),
    });
    expect(missingUidApiResponse.status).toBe(400); // Expecting 400 as a schema validation error


    // --- Missing createdAt ---
    const missingCreatedAtData = {
      name: "test_name",
      email: "missing.createdat.with.auth@example.com", // Unique email for this scenario
      uid: validUserUid, // <-- Use the valid UID
      // createdAt is intentionally missing here
    };
    const missingCreatedAtApiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: commonHeaders, // <-- Using common headers with token
      body: JSON.stringify(missingCreatedAtData),
    });
    expect(missingCreatedAtApiResponse.status).toBe(400);


    // --- Invalid createdAt (not a valid date string) ---
    const invalidCreatedAtData = {
      name: "test_name",
      email: "invalid.createdat.with.auth@example.com", // Unique email for this scenario
      uid: validUserUid, // <-- Use the valid UID
      createdAt: "this-is-definitely-not-a-date", // An invalid date string
    };
    const invalidCreatedAtApiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: commonHeaders, // <-- Using common headers with token
      body: JSON.stringify(invalidCreatedAtData),
    });
    expect(invalidCreatedAtApiResponse.status).toBe(400);

  });

  //Test Case 3: Adding user to database conflicting with firestore auth
  test('should disallow any database writes when user data does not exist or conflicts with auth', async () => {
    const testUserAuth = {
      email: "testuser.for.conflict@test.com",
      displayName: "ConflictTestUser",
      password: "password123",
    };

    const newAuthUser = await adminAuth.createUser(testUserAuth);
    const currentTimeIso = new Date().toISOString();

    // --- Scenario 1: UID in payload does NOT match the existing Auth user's UID ---
    const invalidUidUserData = {
      type: "individual",
      email: testUserAuth.email,
      name: testUserAuth.displayName,
      uid: "a_non_existent_uid_123",
      createdAt: currentTimeIso,
    };

    // If this API call also requires the token, you'd add commonHeaders here.
    // For now, it seems this test is specifically about conflicting data *without* a matching token.
    const invalidUidApiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validUserToken}` //Token not for invalidUidUser
       },
      body: JSON.stringify(invalidUidUserData),
    });

    const invalidUidApiResponseData = await invalidUidApiResponse.json();
    console.log("Scenario 1 (Invalid UID) - API Response:", invalidUidApiResponseData);

    expect(invalidUidApiResponse.status).toBe(403);
    expect(invalidUidApiResponseData.message).toContain("Authenticated email/uid from token does not match provided email/uid.");

    // --- Scenario 2: Email in payload does NOT match the existing Auth user's email (but UID does match) ---
    const fakeEmailProvidedData = {
      type: "individual",
      email: "this.is.a.fake.email@test.com",
      name: testUserAuth.displayName,
      uid: newAuthUser.uid,
      createdAt: currentTimeIso,
    };

    // If this API call also requires the token, you'd add commonHeaders here.
    const fakeEmailApiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validUserToken}` //Token not for invalidUidUser
      },
      body: JSON.stringify(fakeEmailProvidedData),
    });

    const fakeEmailApiResponseData = await fakeEmailApiResponse.json();
    console.log("Scenario 2 (Fake Email) - API Response:", fakeEmailApiResponseData);

    expect(fakeEmailApiResponse.status).toBe(403);
    expect(fakeEmailApiResponseData.message).toContain("Authenticated email/uid from token does not match provided email/uid.");

    // --- Scenario 3: Email and UID match user but Token does NOT ---
    const invalidTokenProvidedData = {
      type: "individual",
      email: newAuthUser.email,
      name: newAuthUser.displayName,
      uid: newAuthUser.uid,
      createdAt: currentTimeIso,
    };

    const invalidTokenApiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validUserToken}` //Token not for invalidUidUser
      },
      body: JSON.stringify(invalidTokenProvidedData),
    });

    const invalidTokenApiResponseData = await invalidTokenApiResponse.json();

    expect(invalidTokenApiResponse.status).toBe(403); //Not authorized
    expect(invalidTokenApiResponseData.message).toContain("Authenticated email/uid from token does not match provided email/uid.");

  });

});