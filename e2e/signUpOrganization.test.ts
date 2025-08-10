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
                role: invitedEmployee.role,
                employeeId: invitedEmployee.employeeId,
                status: "invited", // The user is not yet active
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

    // Test Case 2: Employee ID does not exist
    test('should fail if the employeeId does not exist in the organization', async () => {
        const nonExistentEmployeeId = "EMP-DOES-NOT-EXIST";

        // 1. Call the service with an employeeId that was never created
        const apiResponse = await firebaseAuthService.signUp.signUpOrganization({
            name: "Ghost User",
            email: "ghost@testcorp.com",
            password: "password123",
            organizationId: testOrg.organizationId,
            employeeId: nonExistentEmployeeId,
        });

        // 2. Verify the API returned a failure response
        expect(apiResponse.ok).toBe(false);
        expect(apiResponse.status).toBe(400); // Or the specific status code your API returns for this error

        // 3. Verify the error message in the response body
        const responseBody = await apiResponse.json();
        expect(responseBody.message).toContain("Employee with passed employeeId does not exist in this organization");
    });

    // Test Case 3: Organization ID does not exist
    test('should fail if the organizationId does not exist', async () => {
        const nonExistentOrgId = "ORG-DOES-NOT-EXIST";

        // 1. Call the service with an organizationId that was never created
        const apiResponse = await firebaseAuthService.signUp.signUpOrganization({
            name: invitedEmployee.name,
            email: invitedEmployee.email,
            password: invitedEmployee.password,
            organizationId: nonExistentOrgId,
            employeeId: invitedEmployee.employeeId,
        });

        // 2. Verify the API returned a failure response
        expect(apiResponse.ok).toBe(false);
        expect(apiResponse.status).toBe(400); // Assuming a 400 Bad Request for this validation error

        // 3. Verify the error message in the response body
        const responseBody = await apiResponse.json();
        expect(responseBody.message).toContain("Organization with passed organizationId does not exist");
    });

    // Test Case 4: Employee ID is already associated with an account
    test('should fail if the employeeId is already associated with another user', async () => {
        // 1. First, simulate that another user has already claimed this employee ID
        const firstUser = await adminAuth.createUser({ email: 'first.user@test.com', password: 'password123' });
        await adminDb.collection('users').doc(firstUser.uid).set({
            name: 'First User',
            email: 'first.user@test.com',
            organizationId: testOrg.organizationId,
            employeeId: invitedEmployee.employeeId, // This user claims the ID
        });
        // Also update the employee record to "active"
        await adminDb.collection(`organizations/${testOrg.organizationId}/employees`).doc(invitedEmployee.employeeId).update({
            status: 'active',
            uid: firstUser.uid,
        });

        // 2. Now, a second user tries to sign up with the SAME employeeId
        const apiResponse = await firebaseAuthService.signUp.signUpOrganization({
            name: invitedEmployee.name,
            email: invitedEmployee.email, // This email is trying to claim the same spot
            password: invitedEmployee.password,
            organizationId: testOrg.organizationId,
            employeeId: invitedEmployee.employeeId,
        });

        // 3. Verify the API correctly returns a conflict error
        expect(apiResponse.ok).toBe(false);
        expect(apiResponse.status).toBe(400);
        
        // 4. Verify the error message
        const responseBody = await apiResponse.json();
        expect(responseBody.message).toContain("Employee with passed employeeId already associated with an account");
    });
});
