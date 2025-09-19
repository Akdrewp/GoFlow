import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { createOrganization, addRoleToOrg, addEmployeeToOrg, addUser } from "@/api/firebase/firebaseService";
import { ORGANIZATION_RESOURCES, Role, TankType, Truck } from "@/api/database/database";

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


  /**
   * Creates 2 organizations
   * 
   *  testOrg1 with employees:
   *  testAdminUser and testDriverUser
   *  with roles:
   *  admin and driver
   * 
   *  testOrg2 with employees:
   *  testOrg2AdminUser
   *  with roles:
   *  admin
   */
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
    try {
      await clearFirestoreAuth();
      await clearFirestoreDB();
      await adminDb.terminate();
    } catch (e) {
      console.error("Error during afterAll cleanup:", e);
    }
  });

  // Test Case 1: Successful Truck Creation
  test('should successfully add a new truck to an organization', async () => {
    const testTruck: Truck = {
      name: "Big Bertha",
      truckId: "TRUCK-01",
      tankType: TankType.SINGLE,
      chartId: "chart-standard-single-tank"
    };

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/trucks`;

    // Make the API call with a valid token and data
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${adminUserAuthToken}`
      },
      body: JSON.stringify(testTruck),
    });

    // Assert the API response is successful
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('success');
    expect(responseBody.data.truckId).toBe(testTruck.truckId);

    // Verify the truck was written to the database correctly
    const truckDocRef = adminDb.collection('organizations').doc(testOrg1.organizationId).collection('trucks').doc(testTruck.truckId);
    const truckDoc = await truckDocRef.get();
    
    expect(truckDoc.exists).toBe(true);
    expect(truckDoc.data()?.name).toBe(testTruck.name);
    expect(truckDoc.data()?.tankType).toBe(testTruck.tankType);
  });

  // Test Case 2: Duplicate Truck ID
  test('should fail with a 409 Conflict error if the truck ID already exists', async () => {
    const testTruck: Truck = {
      name: "Duplicate Truck",
      truckId: "TRUCK-DUPE",
      tankType: TankType.SPLIT,
      chartId: "chart-standard-split-tank"
    };

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/trucks`;

    // Successfully add testTruck
    const initialResponse = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${adminUserAuthToken}`
      },
      body: JSON.stringify(testTruck),
    });
    expect(initialResponse.status).toBe(201); // Ensure the first one was created

    // Create duplicate truck with duplicate truckId
    const conflictResponse = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${adminUserAuthToken}`
      },
      body: JSON.stringify(testTruck),
    });

    // Make sure it's conflict
    expect(conflictResponse.status).toBe(409);
    const responseBody = await conflictResponse.json();
    expect(responseBody.status).toBe('fail');
    expect(responseBody.message).toBe(`Truck with ID "${testTruck.truckId}" already exists in this organization.`);
  });


});
