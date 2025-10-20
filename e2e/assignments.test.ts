import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { addAssignmentToOrg, addEmployeeToOrg, addRoleToOrg, addTruckToOrg, addUser, createOrganization, addProductToOrg, addLoadoutToOrg } from "@/api/firebase/firebaseService";
import { Loadout, MeasurementType, ORGANIZATION_RESOURCES, Product, Role, TankType, Truck } from "@/api/database/database";
import { UserRecord } from "firebase-admin/auth";

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Client auth instance needed to get an ID token
const authClient = getAuth();

describe('Assignments API Route E2E Tests', () => {

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

  const testDriverUser2 = {
    email: "driver-user2@test.com",
    name: "Test Driver2",
    password: "securePassword123",
  };

  const driverUserEmployee = {
    name: testDriverUser.name,
    roleId: "driver",
    status: "invited" as const,
    employeeId: "2",
  };

  const driverUser2Employee = {
    name: testDriverUser2.name,
    roleId: "driver",
    status: "invited" as const,
    employeeId: "3",
  };

  const testOrg1 = {
    name: "TestCo Roles",
    email: "contact@testcoroles.com",
    organizationId: "ROLETEST123"
  };

  const testTruck1: Truck = {
    name: "Big Blue",
    truckId: "TRUCK-01",
    tankType: TankType.SINGLE,
    chartId: "chart-single-1",
    assignedUserId: null
  };

  const testTruck2: Truck = {
    name: "Big Red",
    truckId: "TRUCK-02",
    tankType: TankType.SINGLE,
    chartId: "chart-single-1",
    assignedUserId: null
  };
  
  const productA: Product = {
    productId: "product-a", name: "Product A", measurementType: MeasurementType.CALIBRATED,
    targetRate: 10, unitName: "Liters",
  };

  const standardLoadout: Loadout = {
      loadoutId: "standard-loadout",
      name: "Standard Loadout",
      productIds: [productA.productId]
  };

  let adminUserAuthToken: string;
  let driverUserAuthToken: string;
  let driverUser2AuthToken: string;

  let driverAuthUser: UserRecord;

  beforeEach(async () => {
    try {
      await clearFirestoreAuth();
      await clearFirestoreDB();
      
      const adminAuthUser = await adminAuth.createUser(testAdminUser);
      driverAuthUser = await adminAuth.createUser(testDriverUser);
      const driverAuthUser2 = await adminAuth.createUser(testDriverUser2);

      adminUserAuthToken = await adminAuth.createSessionCookie(await (await signInWithEmailAndPassword(authClient, testAdminUser.email, testAdminUser.password)).user.getIdToken(), { expiresIn: 60 * 60 * 1000});
      driverUserAuthToken = await adminAuth.createSessionCookie(await (await signInWithEmailAndPassword(authClient, testDriverUser.email, testDriverUser.password)).user.getIdToken(), { expiresIn: 60 * 60 * 1000});
      driverUser2AuthToken = await adminAuth.createSessionCookie(await (await signInWithEmailAndPassword(authClient, testDriverUser2.email, testDriverUser2.password)).user.getIdToken(), { expiresIn: 60 * 60 * 1000});

      await addUser({
        ...testAdminUser,
        type: "individual",
        uid: adminAuthUser.uid,
        createdAt: new Date(),
      });

      await createOrganization(adminUserAuthToken, {
        ...testOrg1,
        createdBy: adminAuthUser.uid,
        createdAt: new Date(),
      });

      // Create a driver permissions object
      const driverPermissions = ORGANIZATION_RESOURCES.reduce((accumulator, resource) => {
        if (resource == "assignments") {
          accumulator[resource] = { read: true, write: false };
        } else {
          accumulator[resource] = { read: true, write: true };
        }
        return accumulator;
      }, {} as Role['permissions']); // Start with an empty object of the correct type

      const driverRole: Role = {
        name: "Driver", roleId: "driver", level: 50,
        permissions: driverPermissions
      };
      await addRoleToOrg(adminUserAuthToken, testOrg1.organizationId, driverRole);
      
      await addEmployeeToOrg(adminUserAuthToken, testOrg1.organizationId, driverUserEmployee);
      await addEmployeeToOrg(adminUserAuthToken, testOrg1.organizationId, driverUser2Employee);

      await addUser({
        ...testDriverUser, type: "organization", uid: driverAuthUser.uid, createdAt: new Date(),
        organizationId: testOrg1.organizationId, employeeId: driverUserEmployee.employeeId
      });
      await addUser({
        ...testDriverUser2, type: "organization", uid: driverAuthUser2.uid, createdAt: new Date(),
        organizationId: testOrg1.organizationId, employeeId: driverUser2Employee.employeeId
      });

      await addTruckToOrg(adminUserAuthToken, testOrg1.organizationId, testTruck1);
      await addTruckToOrg(adminUserAuthToken, testOrg1.organizationId, testTruck2);
      await addProductToOrg(adminUserAuthToken, testOrg1.organizationId, productA);
      await addLoadoutToOrg(adminUserAuthToken, testOrg1.organizationId, standardLoadout);

    } catch (e) {
      console.error("Critical Error during beforeEach setup:", e);
      throw e;
    }
  });

  afterAll(async () => {
    await clearFirestoreAuth();
    await clearFirestoreDB();
  });

  // POST

  // Test Case 1: Successful Assignment Creation
  test('should allow a driver to successfully assign themselves to an available truck', async () => {
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments`;

    const newAssignmentBody = {
      truckId: testTruck1.truckId,
      employeeId: driverUserEmployee.employeeId,
      loadoutId: standardLoadout.loadoutId, // Include the loadout
    };
    
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(newAssignmentBody),
    });

    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('success');
    expect(responseBody.data.loadoutId).toBe(standardLoadout.loadoutId);

    const assignmentId = responseBody.data.assignmentId;
    const assignmentDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/assignments/${assignmentId}`).get();
    expect(assignmentDoc.exists).toBe(true);
  });

  // Test Case 2: Creating assignments to others without permission
  test('should fail if a user tries to create an assignment for another user', async () => {
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments`;
    
    const crossAssignmentBody = {
      truckId: testTruck1.truckId,
      employeeId: driverUserEmployee.employeeId, // Attempting to assign for driver 1
      loadoutId: standardLoadout.loadoutId,
    };

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUser2AuthToken}` }, // Authenticated as driver 2
      body: JSON.stringify(crossAssignmentBody),
    });

    expect(response.status).toBe(403);
  });

  // Test Case 3: Successful unassignment
  test('should allow a driver to successfully end their own active assignment', async () => {
    const newAssignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
      truckId: testTruck1.truckId, 
      userId: driverAuthUser.uid, 
      employeeId: driverUserEmployee.employeeId,  // Add assignment as driverUser
      loadoutId: standardLoadout.loadoutId
    });

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`;

    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify({ unassignedAt: new Date() }),
    });

    expect(response.status).toBe(200);
    const assignmentDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`).get();
    expect(assignmentDoc.data()?.unassignedAt).not.toBeNull();
  });

  // Test Case 4: Create Conflict (Truck Already Assigned)
  test('should fail if a truck is already actively assigned', async () => {
    // Assign driver 1 to truck 1
    await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
        truckId: testTruck1.truckId, userId: driverAuthUser.uid, employeeId: driverUserEmployee.employeeId, loadoutId: standardLoadout.loadoutId
    });

    // Attempt to assign driver 2 to the SAME truck
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments`;
    const conflictAssignmentBody = {
      truckId: testTruck1.truckId,
      employeeId: driverUser2Employee.employeeId,
      loadoutId: standardLoadout.loadoutId,
    };
    
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUser2AuthToken}` },
      body: JSON.stringify(conflictAssignmentBody),
    });

    // Verify response is conflict
    expect(response.status).toBe(409);
  });

  // Test Case 8: Create Conflict (User Already Assigned)
  test('should fail if a user already has an active assignment', async () => {
    // Assign driver 1 to truck 1
    await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
        truckId: testTruck1.truckId, userId: driverAuthUser.uid, employeeId: driverUserEmployee.employeeId, loadoutId: standardLoadout.loadoutId
    });

    // Attempt to assign the SAME driver to a DIFFERENT truck
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments`;
    const conflictAssignmentBody = {
      truckId: testTruck2.truckId, // A different, available truck
      employeeId: driverUserEmployee.employeeId,
      loadoutId: standardLoadout.loadoutId,
    };
    
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(conflictAssignmentBody),
    });

    // Verify response is conflict
    expect(response.status).toBe(409);
  });

  // PUT

  // Test Case 5: Updating assignments of others without permission
  test('should fail if a user tries to update an assignment that is not theirs', async () => {
    const newAssignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
      truckId: testTruck1.truckId, 
      userId: driverAuthUser.uid, 
      employeeId: driverUserEmployee.employeeId, // Add assignment as driverUser
      loadoutId: standardLoadout.loadoutId
    });
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`;

    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUser2AuthToken}` }, // Authenticated as driver 2
      body: JSON.stringify({ unassignedAt: new Date() }),
    });

    expect(response.status).toBe(403);
  });

  // DELETE

  // Test Case 6: Successful deletion
  test('should allow a user to delete an assignment they created', async () => {
    const newAssignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
      truckId: testTruck1.truckId, userId: driverAuthUser.uid, employeeId: driverUserEmployee.employeeId, loadoutId: standardLoadout.loadoutId
    });

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`;
    
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${driverUserAuthToken}` },
    });

    expect(response.status).toBe(200);
    
    const assignmentDocRef = adminDb.doc(`organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`);
    const docSnap = await assignmentDocRef.get();
    expect(docSnap.exists).toBe(false);
  });

  // Test Case 7: Deleting assignments of others without permission
  test('should fail if a user tries to delete an assignment that is not theirs', async () => {
    const newAssignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
      truckId: testTruck1.truckId, userId: driverAuthUser.uid, employeeId: driverUserEmployee.employeeId, loadoutId: standardLoadout.loadoutId
    });

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`;
    
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${driverUser2AuthToken}` }, // Authenticated as driver 2
    });

    expect(response.status).toBe(403);
  });
});

