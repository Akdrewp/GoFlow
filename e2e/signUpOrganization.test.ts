import { getAuth } from "firebase/auth"; 
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { firebaseAuthService } from "@/api/firebase/firebaseAuthService";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";

const authClient = getAuth();

describe('Organization Signup API Route E2E Tests', () => {

    const testOrg = {
        name: "TestCorp Inc.",
        email: "contact@testcorp.com",
        organizationId: "CORP123"
    };

    const invitedEmployee = {
        name: "Jane Doe",
        email: "jane.doe@testcorp.com",
        role: "Driver",
        employeeId: "EMP001",
        password: "password123"
    };

    // This block runs before each test to set up the scenario
    beforeEach(async () => {
        try {
            // 1. Clear emulators for a clean slate
            await clearFirestoreAuth();
            await clearFirestoreDB();

            // 2. Create the organization that the user will join
            await adminDb.collection('organizations').doc(testOrg.organizationId).set({
                ...testOrg,
                ownerUid: "initial-admin-uid", // Placeholder owner
                createdAt: new Date(),
            });

            // 3. Create the "invited" employee record in the organization's sub-collection
            // This is the record the signup process will look for and activate.
            const employeeDocRef = adminDb.collection(`organizations/${testOrg.organizationId}/employees`).doc(invitedEmployee.employeeId);
            await employeeDocRef.set({
                name: invitedEmployee.name,
                email: invitedEmployee.email,
                role: invitedEmployee.role,
                employeeId: invitedEmployee.employeeId,
                status: "invited", // The user is not yet active
                uid: null, // The UID is null because the user hasn't signed up yet
            });

        } catch (e) {
            console.error("Critical Error during beforeEach setup for org signup:", e);
            throw e;
        }
    });
    
    // This block runs once after all tests are finished
    afterAll(async () => {
        await clearFirestoreAuth();
        await clearFirestoreDB();
        await adminDb.terminate();
    });

    // Test Case 1: Successful Organization Signup
    test('should successfully sign up a new organization user and link them to the employee record', async () => {
        // 1. Call the organization sign-up service method
        const apiResponse = await firebaseAuthService.signUp.signUpOrganization({
            name: invitedEmployee.name,
            email: invitedEmployee.email,
            password: invitedEmployee.password,
            organizationId: testOrg.organizationId,
            employeeId: invitedEmployee.employeeId,
        });

        // 2. Verify the API response was successful
        expect(apiResponse.status).toBe(201);
        const apiResponseData = await apiResponse.json();
        expect(apiResponseData.status).toBe('success');
        
        const createdUid = apiResponseData.data.uid;
        expect(createdUid).toBeDefined();

        // 3. Verify the user was created in Firebase Auth
        const authUserRecord = await adminAuth.getUser(createdUid);
        expect(authUserRecord.email).toBe(invitedEmployee.email);

        // 4. Verify the main user document was created correctly
        const userDoc = await adminDb.collection('users').doc(createdUid).get();
        expect(userDoc.exists).toBe(true);
        expect(userDoc.data()?.organizationId).toBe(testOrg.organizationId);
        expect(userDoc.data()?.employeeId).toBe(invitedEmployee.employeeId);

        // 5. Verify the employee sub-collection document was updated (activated)
        const employeeDoc = await adminDb.collection(`organizations/${testOrg.organizationId}/employees`).doc(invitedEmployee.employeeId).get();
        expect(employeeDoc.exists).toBe(true);
        expect(employeeDoc.data()?.status).toBe('active');
        expect(employeeDoc.data()?.uid).toBe(createdUid); // The UID should now be linked
    });
});
