import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth } from "@/api/firebase/firebaseAdmin";
import { clearFireStore, clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { AccessType, canUserAccessData} from "@/api/firebase/firebaseVerify";
import { createOrganization, addRoleToOrg, addEmployeeToOrg, addUser } from "@/api/firebase/firebaseService";
import { ORGANIZATION_RESOURCES, Role } from "@/api/database/database";

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

  const testOrg1 = {
    name: "TestCo Roles",
    email: "contact@testcoroles.com",
    organizationId: "ROLETEST123"
  };

  const testOrg2 = {
    name: "TestCo2 Roles",
    email: "contact@testcoroles2.com",
    organizationId: "ROLETEST1234"
  };

  const testOrg2AdminUser = {
    email: "admin-user2@test.com",
    name: "Test Admin2",
    password: "securePassword123",
  };

  let adminUserAuthToken: string;
  let driverUserAuthToken: string;
  let testOrg2AdminToken: string;

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
      await addUser({
        ...testAdminUser,
        type: "individual",
        uid: adminAuthUser.uid,
        createdAt: new Date(),
      });

      // Create organization with admin as creator
      await createOrganization(adminUserAuthToken, {
        ...testOrg1,
        createdBy: adminAuthUser.uid,
        createdAt: new Date(),
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
      await addRoleToOrg(adminUserAuthToken, testOrg1.organizationId, driverRole);

      // Add driver user as an employee
      await addEmployeeToOrg(
        adminUserAuthToken, 
        testOrg1.organizationId,
        driverUserEmployee
      );

      // Activate user in organization
      await addUser({
        ...testDriverUser,
        type: "organization",
        uid: driverAuthUser.uid,
        createdAt: new Date(),
        organizationId: testOrg1.organizationId,
        employeeId: driverUserEmployee.employeeId
      });

      // Add testOrg2 with testOrg2Admin as admin

      // Create testOrg2Admin user
      const testOrg2AdminAuthUser = await adminAuth.createUser(testOrg2AdminUser);

      // Sign in to get auth token
      testOrg2AdminToken = await (await signInWithEmailAndPassword(authClient, testOrg2AdminUser.email, testOrg2AdminUser.password)).user.getIdToken();

      // Add testOrg2Admin to database
      await addUser({
        ...testOrg2AdminUser,
        type: "individual",
        uid: testOrg2AdminAuthUser.uid,
        createdAt: new Date(),
      });

      // Create organization with testOrg2Admin as creator
      await createOrganization(testOrg2AdminToken, {
        ...testOrg2,
        createdBy: testOrg2AdminAuthUser.uid,
        createdAt: new Date(),
      });

    } catch (e) {
      console.error("Critical Error during beforeEach setup:", e);
      throw e;
    }
  });

  afterAll(async () => {
    await clearFireStore();
  });

  // Test Case 1: Admin Permissions
  test('admin user should have full READ and WRITE access to all organization resources', async () => {
    // Create an array of all the access checks we need to perform for the admin.
    const accessChecks = ORGANIZATION_RESOURCES.flatMap(resource => [
        // Admin should be able to READ the collection
        canUserAccessData(adminUserAuthToken, `organizations/${testOrg1.organizationId}/${resource}`, AccessType.READ),
        // Admin should be able to WRITE to the collection
        canUserAccessData(adminUserAuthToken, `organizations/${testOrg1.organizationId}/${resource}`, AccessType.WRITE)
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
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg1.organizationId}/roles`, AccessType.READ),
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg1.organizationId}/employees`, AccessType.WRITE),
      // Assuming 'trucks' is a resource they should have full access to
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg1.organizationId}/trucks`, AccessType.READ),
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg1.organizationId}/trucks`, AccessType.WRITE),
    ];

    // Define the checks that are expected to FAIL for a driver
    const failingChecks = [
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg1.organizationId}/roles`, AccessType.WRITE),
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg1.organizationId}/employees`, AccessType.READ),
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
    const selfResourcePath = `organizations/${testOrg1.organizationId}/employees/${driverUserEmployee.employeeId}`;
    
    // This check should pass because of the self-access rule, even though the driver's
    // role does not have general read access to the 'employees' collection.
    const selfAccessCheck = canUserAccessData(driverUserAuthToken, selfResourcePath, AccessType.READ);

    await expect(selfAccessCheck).resolves.toBeDefined();
  });

  // Test Case 4: Cross-Organization Access
  test('should prevent users from accessing resources in other organizations', async () => {
    // A list of checks that should all fail due to cross-organization access attempts.
    const failingChecks = [
      // Admin from Org 1 trying to access Org 2
      canUserAccessData(adminUserAuthToken, `organizations/${testOrg2.organizationId}/employees`, AccessType.READ),
      // Driver from Org 1 trying to access Org 2
      canUserAccessData(driverUserAuthToken, `organizations/${testOrg2.organizationId}/roles`, AccessType.READ),
      // Admin from Org 2 trying to access Org 1
      canUserAccessData(testOrg2AdminToken, `organizations/${testOrg1.organizationId}/trucks`, AccessType.WRITE),
    ];

    // Verify that every single check in the list rejects with an error.
    for (const check of failingChecks) {
      await expect(check).rejects.toThrow("Forbidden: User is not a member of the requested organization.");
    }
  });

  // Test Case 5: Invalid Role Assignment
  test('should fail to add an employee if the specified roleId does not exist', async () => {
    // This employee data uses a roleId that was never created in the beforeEach block.
    const employeeWithInvalidRole = {
      name: "User With Bad Role",
      roleId: "non_existent_role",
      status: "invited",
      employeeId: "3",
    };

    // The service function call is expected to throw a specific error.
    const addEmployeeCheck = addEmployeeToOrg(
      adminUserAuthToken,
      testOrg1.organizationId,
      employeeWithInvalidRole
    );

    // Assert that the promise rejects with our custom error.
    await expect(addEmployeeCheck).rejects.toThrow(
      "Employee with passed roleId: non_existent_role does not exist in organization"
    );
  });
});
