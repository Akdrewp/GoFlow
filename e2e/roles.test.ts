import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFireStore, clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { AccessType, canUserAccessData} from "@/api/firebase/firebaseVerify";
import { createOrganization, addRoleToOrg, addEmployeeToOrg, addUser } from "@/api/firebase/firebaseService";
import { ORGANIZATION_RESOURCES, Role } from "@/api/database/database";

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
    const results = await Promise.allSettled(failingChecks);
    
    // Assert that every promise in the array was rejected.
    results.forEach(result => {
      expect(result.status).toBe('rejected');
    });
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
      `Role with ID "${employeeWithInvalidRole.roleId}" does not exist in this organization.`
    );
  });

  // POST

  // Test Case 6: Successful Role Creation
  test('should successfully create a new role', async () => {
    const managerPermissions = ORGANIZATION_RESOURCES.reduce((acc, resource) => {
      acc[resource] = { read: true, write: true };
      return acc;
    }, {} as Role['permissions']);

    const newRole: Role = {
      name: "Manager",
      roleId: "manager",
      level: 80,
      permissions: managerPermissions
    };
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/roles`;

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(newRole),
    });

    // Verify response is successful
    expect(response.status).toBe(200);
    
    // Verify the role was created in Firestore
    const roleDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/roles/${newRole.roleId}`).get();
    expect(roleDoc.exists).toBe(true);
    const data = roleDoc.data();
    expect(data?.name).toBe("Manager");
    expect(data?.permissions).toEqual(managerPermissions);
  });

  // Test Case 7: Create with Incomplete Permissions
  test('Invalid Create: should fail to create a role if the permissions object is incomplete', async () => {
    const fullPermissions = ORGANIZATION_RESOURCES.reduce((acc, resource) => {
      acc[resource] = { read: true, write: true };
      return acc;
    }, {} as Role['permissions']);
    
    // Create an incomplete permissions object, missing the 'employees' resource
    const incompletePermissions = { ...fullPermissions };
    delete incompletePermissions.employees;

    const newRole: Omit<Role, 'roleId'> & { roleId?: string } = {
      name: "Invalid Manager",
      roleId: "invalid-manager",
      level: 80,
      permissions: incompletePermissions
    };
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/roles`;

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(newRole),
    });

    // This test assumes the Zod schema requires all keys for the 'permissions' object.
    expect(response.status).toBe(400); // Bad Request
    const responseBody = await response.json();
    expect(responseBody.status).toBe('fail');
  });

  // PUT

  // Test Case 8: Successful Role Update
  test('should successfully update an existing role', async () => {
    const supervisorPermissions = ORGANIZATION_RESOURCES.reduce((acc, resource) => {
        acc[resource] = { read: true, write: true };
        return acc;
    }, {} as Role['permissions']);

    const roleToUpdate: Role = {
      name: "Supervisor",
      roleId: "supervisor",
      level: 75,
      permissions: supervisorPermissions
    };
    await addRoleToOrg(adminUserAuthToken, testOrg1.organizationId, roleToUpdate);

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/roles/${roleToUpdate.roleId}`;

    const updatedData = {
      permissions: {
        ...supervisorPermissions,
        employees: { read: true, write: false } // Revoke write access to employees
      }
    };

    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(updatedData),
    });

    // Verify response is successful
    expect(response.status).toBe(200);
    
    // Verify the role was updated in Firestore
    const roleDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/roles/${roleToUpdate.roleId}`).get();
    const data = roleDoc.data();

    console.log("data?.permissions updatedData", data?.permissions, updatedData);

    expect(data?.permissions).toEqual(updatedData.permissions);
  });

  // DELETE

  // Test Case 9: Successful Role Deletion
  test('should successfully delete an existing, unused role', async () => {
    const tempPermissions = ORGANIZATION_RESOURCES.reduce((acc, resource) => {
        acc[resource] = { read: false, write: false };
        return acc;
    }, {} as Role['permissions']);

    const roleToDelete: Role = {
      name: "Temporary Role",
      roleId: "temp-role",
      level: 10,
      permissions: tempPermissions
    };
    await addRoleToOrg(adminUserAuthToken, testOrg1.organizationId, roleToDelete);
    
    const roleDocRef = adminDb.doc(`organizations/${testOrg1.organizationId}/roles/${roleToDelete.roleId}`);
    expect((await roleDocRef.get()).exists).toBe(true);

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/roles/${roleToDelete.roleId}`;

    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${adminUserAuthToken}` },
    });
    
    expect(response.status).toBe(200);

    // Verify the role was deleted from Firestore
    const docSnap = await roleDocRef.get();
    expect(docSnap.exists).toBe(false);
  });
});
