import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";

import { firebaseAuthService } from "@/api/firebase/firebaseSignUp";

// const API_SIGNUP_URL = 'http://localhost:3000/api/auth/signup';

const clearFirestoreAuth = async () => {
    //Deletes 1000 top users
    const topUsers = await adminAuth.listUsers();
    topUsers.users.forEach( (user) => {
        void (async () => {
            await adminAuth.deleteUser(user.uid);
        })();
    });
};

const clearFirestoreDB = async () => {
    // Get a reference to the 'users' collection
    const usersCollectionRef = adminDb.collection('users');

    // Use recursiveDelete on the collection reference
    // This will delete all documents and subcollections within 'users'.
    await adminDb.recursiveDelete(usersCollectionRef);
    console.log("Firestore 'users' collection and its subcollections (if any) recursively deleted.");
};

describe('Signup API Route E2E Tests', () => {
    beforeEach( async () => {
        try {
            await clearFirestoreAuth();
            await clearFirestoreDB();
        } catch(e) {
            console.log("Error clearing firestoreAuth and/or firestoreDb", e);
            throw(e);
        }
    });
    
    afterAll( async () => {
        //Close firestore database when done
        await adminDb.terminate();
    });


    // Test Case 1: Successful Signup
    test('should successfully sign up a new individual user and verify in Auth and Firestore', async () => {
        const testName = 'New User E2E';
        const testEmail = 'e2e.test.individual@example.com';
        const testPassword = 'securePassword123';

        // Call your client-side service method, which internally calls Auth SDK and your API route
        const apiResponse = await firebaseAuthService.signUpIndividual({
            name: testName,
            email: testEmail,
            password: testPassword
        });

        // Parse the JSON response from your API route
        const apiResponseData = await apiResponse.json();

        // 1. Verify the API Route's HTTP Response Status
        expect(apiResponse.status).toBe(201); // Expect a 201 Created status
        // 2. Verify the API Route's JSON Response Body
        expect(apiResponseData.status).toBe('success');
        expect(apiResponseData.message).toBe('User account succesfully added to database');
        expect(apiResponseData.data).toHaveProperty('uid'); // API should return the UID from Auth
        expect(apiResponseData.data.name).toBe(testName);
        expect(apiResponseData.data.email).toBe(testEmail);

        const createdUid = apiResponseData.data.uid; // Get UID from the API response

        // 3. Verify User existence and details in Firebase Authentication Emulator (using Admin SDK)
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

        // 4. Verify User Profile existence and data in Firestore Emulator (using Admin SDK)
        const userDocRef = adminDb.collection('users').doc(createdUid);
        const userDocSnap = await userDocRef.get();

        expect(userDocSnap.exists).toBe(true);
        const firestoreData = userDocSnap.data();
        console.log("FIRESTORE DATA CONSOLE LOG TEST 1: ",firestoreData);

        expect(firestoreData).toBeDefined();
        expect(firestoreData?.name).toBe(testName);
        expect(firestoreData?.email).toBe(testEmail);
        expect(firestoreData?.uid).toBe(createdUid);

        //Check whether createdAt is a date
        const createdAtDate = new Date(firestoreData?.createdAt).getDate();
        expect(!isNaN(createdAtDate));
        //Check whether date is in the past
        expect(createdAtDate).toBeLessThanOrEqual(new Date().getTime());

        // Also check for absence of optional fields if not provided
        expect(firestoreData).not.toHaveProperty('organizationId');
        expect(firestoreData).not.toHaveProperty('employeeId');

    });
});