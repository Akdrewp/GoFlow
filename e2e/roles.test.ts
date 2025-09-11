import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { AccessType, canUserAccessData, organizationService, userService } from "@/api/firebase/firebaseVerify";
import { ORGANIZATION_RESOURCES, Role } from "@/api/database/database";

// API endpoints used for testing
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Client auth instance needed to get an ID token
const authClient = getAuth();

describe('Roles API Route E2E Tests', () => {

  const testAdminUser = {
    email: "admin-user@test.com",
    name: "Test Admin",
    password: "securePassword123",
  };

  const testDriverUser = {
    email: "driver-user@test.com",
    name: "Test Driver",
    password: "securePassword123",
  };

  const driverUserEmployee = {
    name: testDriverUser.name,
    roleId: "driver",
    status: "invited",
    employeeId: "2",
  };

  const testOrg = {
    name: "TestCo Roles",
    email: "contact@testcoroles.com",
    organizationId: "ROLETEST123"
  };

  let adminUserAuthToken: string;
  let driverUserAuthToken: string;

  beforeEach(async () => {
    try {
      await clearFirestoreAuth();
      await clearFirestoreDB();
      
      // Add users to firebase auth
      const adminAuthUser = await adminAuth.createUser(testAdminUser);
      const driverAuthUser = await adminAuth.createUser(testDriverUser);

      // Get users token
      adminUserAuthToken = await (await signInWithEmailAndPassword(authClient, testAdminUser.email, testAdminUser.password)).user.getIdToken();
      driverUserAuthToken = await (await signInWithEmailAndPassword(authClient, testDriverUser.email, testDriverUser.password)).user.getIdToken();

      // Add driver and admin to users database
      await userService.add({
        ...testAdminUser,
        uid: adminAuthUser.uid,
        createdAt: new Date(),
      });

      // Create organization with admin as creator
      await organizationService.create(adminUserAuthToken, {
        ...testOrg,
        createdBy: adminAuthUser.uid,
        createdAt: new Date(),
      });

      // Add driver user as an employee
      await organizationService.addEmployee(
        adminUserAuthToken, 
        testOrg.organizationId,
        driverUserEmployee
      );

      // Activate user in organization
      await userService.add({
        ...testDriverUser,
        uid: driverAuthUser.uid,
        createdAt: new Date(),
        organizationId: testOrg.organizationId,
        employeeId: driverUserEmployee.employeeId
      });

      // Create a driver permissions object with full access
      const driverPermissions = ORGANIZATION_RESOURCES.reduce((accumulator, resource) => {
        if (resource == "roles") {
          accumulator[resource] = { read: true, write: false };
        } else if (resource == "employees") {
          accumulator[resource] = { read: false, write: true };
        } else {
          accumulator[resource] = { read: true, write: true };
        }
        return accumulator;
      }, {} as Role['permissions']); // Start with an empty object of the correct type

      // Create a driver role with less permissions than admin
      const driverRole: Role = {
        name: "Driver",
        roleId: "driver",
        level: 50,
        permissions: driverPermissions
      };
      await organizationService.addRole(adminUserAuthToken, testOrg.organizationId, driverRole);


    } catch (e) {
      console.error("Critical Error during beforeEach setup:", e);
      throw e;
    }
  });

  afterAll(async () => {
    try {
      await clearFirestoreAuth();
      await clearFirestoreDB();
      await adminDb.terminate();
    } catch (e) {
      console.error("Error during afterAll cleanup:", e);
    }
  });

  // Test Case 1: Admin Permissions
  test('admin user should have full READ and WRITE access to all organization resources', async () => {
    // Create an array of all the access checks we need to perform for the admin.
    const accessChecks = ORGANIZATION_RESOURCES.flatMap(resource => [
        // Admin should be able to READ the collection
        canUserAccessData(adminUserAuthToken, `organizations/${testOrg.organizationId}/${resource}`, AccessType.READ),
        // Admin should be able to WRITE to the collection
        canUserAccessData(adminUserAuthToken, `organizations/${testOrg.organizationId}/${resource}`, AccessType.WRITE)
    ]);

    // Run all checks concurrently and expect none of them to throw an error.
    // .resolves means we expect the Promise to succeed.
    // .toBeDefined() is a simple assertion that the promise resolved with some value.
    await expect(Promise.all(accessChecks)).resolves.toBeDefined();
  });

  // Test Case 2: Driver Permissions
  test('driver user should have access to everything but writing to roles and reading employees', async () => {
    // Define the checks that are expected to PASS for a driver
    const passingChecks = [
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg.organizationId}/roles`, AccessType.READ),
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg.organizationId}/employees`, AccessType.WRITE),
      // Assuming 'trucks' is a resource they should have full access to
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg.organizationId}/trucks`, AccessType.READ),
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg.organizationId}/trucks`, AccessType.WRITE),
    ];

    // Define the checks that are expected to FAIL for a driver
    const failingChecks = [
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg.organizationId}/roles`, AccessType.WRITE),
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg.organizationId}/employees`, AccessType.READ),
    ];

    // Verify that all the "passing" checks resolve successfully
    await expect(Promise.all(passingChecks)).resolves.toBeDefined();

    // Verify that all the "failing" checks reject with an error
    for (const check of failingChecks) {
      await expect(check).rejects.toThrow();
    }
  });

  // Test Case 3: Self-Access
  test('driver user should be able to read their own employee record', async () => {
    // Construct the path to the driver's own employee document
    const selfResourcePath = `organizations/${testOrg.organizationId}/employees/${driverUserEmployee.employeeId}`;
    
    // This check should pass because of the self-access rule, even though the driver's
    // role does not have general read access to the 'employees' collection.
    const selfAccessCheck = canUserAccessData(driverUserAuthToken, selfResourcePath, AccessType.READ);

    await expect(selfAccessCheck).resolves.toBeDefined();
  });
});
