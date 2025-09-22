import { getAuth, signInWithEmailAndPassword } from "firebase/auth"; 
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { addUser } from "@/api/firebase/firebaseService";
import { ORGANIZATION_RESOURCES, Role } from "@/api/database/database";

import { createOrganization, addRoleToOrg } from "@/api/firebase/firebaseService";

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Client auth instance needed to get an ID token
const authClient = getAuth();

describe('Add Employee API Route E2E Tests', () => {

  const testUser = {
    email: "org-admin@test.com",
    name: "Org Admin",
    password: "securePassword123",
  };

  const testOrg = {
    name: "TestCo",
    email: "contact@testco.com",
    organizationId: "TESTCO123"
  };

  let validUserToken: string;
  let adminUid: string;

  beforeEach(async () => {
    try {
      await clearFirestoreAuth();
      await clearFirestoreDB();

      // Create the admin user in Auth
      const adminUserRecord = await adminAuth.createUser({
        email: testUser.email,
        password: testUser.password,
        displayName: testUser.name,
      });
      adminUid = adminUserRecord.uid;

      // Sign in as the user to get a valid ID token
      const userCredential = await signInWithEmailAndPassword(authClient, testUser.email, testUser.password);
      validUserToken = await userCredential.user.getIdToken();

      // Add user to database
      await addUser({
        name: testUser.name,
        email: testUser.email,
        uid: adminUid,
        createdAt: new Date(),
      });

      // Create organization
      await createOrganization(validUserToken, {
        ...testOrg,
        createdBy: adminUid,
        createdAt: new Date()
      });

      // Create a driver permissions object with full access
      const driverPermissions = ORGANIZATION_RESOURCES.reduce((accumulator, resource) => {
        accumulator[resource] = { read: true, write: true };
        return accumulator;
      }, {} as Role['permissions']); // Start with an empty object of the correct type

      // Create a driver role with less permissions than admin
      const driverRole: Role = {
        name: "Driver",
        roleId: "driver",
        level: 50,
        permissions: driverPermissions
      };

      // Add driver role to organization
      await addRoleToOrg(validUserToken, testOrg.organizationId, driverRole);

    } catch (e) {
      console.error("Critical Error during beforeEach setup:", e);
      throw e;
    }
  });

  afterAll(async () => {
    await clearFirestoreAuth();
    await clearFirestoreDB();
    await adminDb.terminate();
  });

  // Test Case 1: Successful Employee Creation
  test('should successfully add a new employee to an organization', async () => {
    const newEmployeeData = {
      name: "New Hire",
      roleId: "driver",
      employeeId: "EMP456",
      status: "invited"
    };
    
    // Construct the dynamic API route
    const employeesApiRoute = NEXT_PUBLIC_BASE_URL + `/api/organizations/${testOrg.organizationId}/employees`;

    const response = await fetch(employeesApiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${validUserToken}`
      },
      body: JSON.stringify(newEmployeeData),
    });

    const responseBody = await response.json();
    console.log("employees.test.ts CONSOLE LOG \n employeesRoute response message: ", responseBody.message);
    expect(response.status).toBe(201);
    expect(responseBody.status).toBe('success');
  });

  /**
   * @todo 
   * Should check not just for missing data but also malformed inputs
   * such as name being a number or status/role not being part of the
   * defined options.
   */
  // Test Case 2: Invalid Form Data
  test('should fail with a 400 Bad Request if form data is invalid', async () => {
    const apiRoute = NEXT_PUBLIC_BASE_URL + `/api/organizations/${testOrg.organizationId}/employees`;
    const commonHeaders = {
      'Content-Type': 'application/json',
      'Cookie': `session-token=${validUserToken}`
    };

    // --- Scenario: Missing 'role' ---
    const missingRoleData = { name: "Incomplete Hire", employeeId: "EMP789", status: "invited" };
    const missingRoleResponse = await fetch(apiRoute, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(missingRoleData),
    });
    expect(missingRoleResponse.status).toBe(400);
    const missingRoleBody = await missingRoleResponse.json();
    expect(missingRoleBody.status).toBe('fail');

    // --- Scenario: Missing 'name' ---
    const missingNameData = { roleId: "Driver", employeeId: "EMP789", status: "invited" };
    const missingNameResponse = await fetch(apiRoute, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(missingNameData),
    });
    expect(missingNameResponse.status).toBe(400);
    const missingNameBody = await missingNameResponse.json();
    expect(missingNameBody.status).toBe('fail');

    // --- Scenario: Missing 'employeeId' ---
    const missingEmployeeIdData = { name: "Incomplete Hire", roleId: "Driver", status: "invited" };
    const missingEmployeeIdResponse = await fetch(apiRoute, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(missingEmployeeIdData),
    });
    expect(missingEmployeeIdResponse.status).toBe(400);
    const missingEmployeeIdBody = await missingEmployeeIdResponse.json();
    expect(missingEmployeeIdBody.status).toBe('fail');

    // --- Scenario: Missing 'status' ---
    const missingStatusData = { name: "Incomplete Hire", roleId: "Driver", employeeId: "EMP789" };
    const missingStatusResponse = await fetch(apiRoute, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(missingStatusData),
    });
    expect(missingStatusResponse.status).toBe(400);
    const missingStatusBody = await missingStatusResponse.json();
    expect(missingStatusBody.status).toBe('fail');
  });

  
  // Test Case 3: Duplicate Employee ID
  test('should fail with a 409 Conflict if the employeeId already exists', async () => {
    const employeeData = {
      name: "First Hire",
      roleId: "driver",
      employeeId: "EMP999",
      status: "invited"
    };
    const apiRoute = NEXT_PUBLIC_BASE_URL + `/api/organizations/${testOrg.organizationId}/employees`;
    const commonHeaders = {
      'Content-Type': 'application/json',
      'Cookie': `session-token=${validUserToken}`
    };

    // 1. Successfully add the first employee
    const initialResponse = await fetch(apiRoute, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(employeeData),
    });
    const responseBody = await initialResponse.json();
    console.log("employees.test.ts test case 3 CONSOLE LOG intialResponse.message: ", responseBody.message);
    expect(initialResponse.status).toBe(201); // Verify the first one was created

    // 2. Attempt to add another employee with the SAME employeeId
    const duplicateData = {
      name: "Second Hire",
      roleId: "driver",
      employeeId: "EMP999", // Same ID
      status: "invited"
    };
    const conflictResponse = await fetch(apiRoute, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(duplicateData),
    });

    // 3. Assert that the API correctly returns a conflict error
    expect(conflictResponse.status).toBe(409);
    const conflictBody = await conflictResponse.json();
    expect(conflictBody.status).toBe('fail');
    expect(conflictBody.message).toContain('already exists');
  });

  
});
