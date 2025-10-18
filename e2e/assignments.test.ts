import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFireStore, clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { addAssignmentToOrg, addEmployeeToOrg, addRoleToOrg, addTruckToOrg, addUser, createOrganization } from "@/api/firebase/firebaseService";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { ORGANIZATION_RESOURCES, Role, TankType, Truck } from "@/api/database/database";
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
    status: "invited",
    employeeId: "2",
  };

  const driverUser2Employee = {
    name: testDriverUser2.name,
    roleId: "driver",
    status: "invited",
    employeeId: "3",
  };

  const testOrg1 = {
    name: "TestCo Roles",
    email: "contact@testcoroles.com",
    organizationId: "ROLETEST123"
  };

  const testTruck1: Truck = {
    name: "Big Blue",
    truckId: "TRUCK-02",
    tankType: TankType.SINGLE,
    chartId: "chart-single-2",
    assignedUserId: null
  };

  const testTruck2: Truck = {
    name: "Big Blue",
    truckId: "TRUCK-01",
    tankType: TankType.SINGLE,
    chartId: "chart-single-2",
    assignedUserId: null
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

  // Define global auth tokens
  let adminUserAuthToken: string;
  let driverUserAuthToken: string;
  let driverUser2AuthToken: string;
  let testOrg2AdminToken: string;

  //define global userRecords
  let adminAuthUser: UserRecord;
  let driverAuthUser: UserRecord;
  let driverAuthUser2: UserRecord;


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
      adminAuthUser = await adminAuth.createUser(testAdminUser);
      driverAuthUser = await adminAuth.createUser(testDriverUser);
      driverAuthUser2 = await adminAuth.createUser(testDriverUser2);

      // Get users token
      adminUserAuthToken = await (await signInWithEmailAndPassword(authClient, testAdminUser.email, testAdminUser.password)).user.getIdToken();
      driverUserAuthToken = await (await signInWithEmailAndPassword(authClient, testDriverUser.email, testDriverUser.password)).user.getIdToken();
      driverUser2AuthToken = await (await signInWithEmailAndPassword(authClient, testDriverUser2.email, testDriverUser2.password)).user.getIdToken();

      // Add admin to users database
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
        } else if (resource == "employees" || resource == "assignments") {
          accumulator[resource] = { read: false, write: false };
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

      // Add driver2 user an employee
      await addEmployeeToOrg(
        adminUserAuthToken,
        testOrg1.organizationId,
        driverUser2Employee
      );

      // Activate driverUser in organization
      await addUser({
        ...testDriverUser,
        type: "organization",
        uid: driverAuthUser.uid,
        createdAt: new Date(),
        organizationId: testOrg1.organizationId,
        employeeId: driverUserEmployee.employeeId
      });

      // Activate driverUser2 in organization
      await addUser({
        ...testDriverUser2,
        type: "organization",
        uid: driverAuthUser2.uid,
        createdAt: new Date(),
        organizationId: testOrg1.organizationId,
        employeeId: driverUser2Employee.employeeId
      });

      // add testTruck1 and testTruck2 to testorg1
      await addTruckToOrg(adminUserAuthToken, testOrg1.organizationId, testTruck1);
      await addTruckToOrg(adminUserAuthToken, testOrg1.organizationId, testTruck2);

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

  // POST route

  // Test Case 1: Successful Assignment Creation by self employee
  test('should allow a driver to successfully assign themselves to an available truck', async () => {
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments`;

    const newAssignment = {
      truckId: testTruck1.truckId,
      userId: driverAuthUser.uid,
    };
    
    // The driver sends a request to assign themselves to testTruck
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${driverUserAuthToken}`
      },
      body: JSON.stringify(newAssignment),
    });

    // Assert the API response is successful
    const responseBody = await response.json();
    console.log(responseBody.message);
    expect(response.status).toBe(201);
    console.log(responseBody.message);
    expect(responseBody.status).toBe('success');
    expect(responseBody.data.truckId).toBe(testTruck1.truckId);
    expect(responseBody.data.userId).toBe(driverAuthUser.uid);

    // Verify the new assignment document was created in Firestore
    const assignmentId = responseBody.data.assignmentId;
    const assignmentDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/assignments/${assignmentId}`).get();
    expect(assignmentDoc.exists).toBe(true);
    expect(assignmentDoc.data()?.unassignedAt).toBeNull();

    // Verify the truck document was updated with the assigned user's ID
    const truckDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/trucks/${testTruck1.truckId}`).get();
    expect(truckDoc.data()?.assignedUserId).toBe(driverAuthUser.uid);
  });

  // Test Case 2: Creating assignments to others without permission
  test('should fail if a user tries to create an assignment for another user', async () => {
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments`;
    

    // Assigning driverUser to this truck
    const crossAssignment = {
      truckId: testTruck1.truckId,
      userId: driverAuthUser.uid,
    };

    // driverUser2 sends a request to assign a truck, but puts driverUser's UID in the body.
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${driverUser2AuthToken}` // Authenticated as driver 2
      },
      body: JSON.stringify(crossAssignment), // Trying to assign for driver 1
    });

    // Verify response is forbidden
    expect(response.status).toBe(403); // Forbidden
  });


  // PUT route

  // Test Case 3: Successful unassignment from assigned employee (End Assignment)
  test('should allow a driver to successfully end their own active assignment', async () => {
    // Create an active assignment for the driver
    const newAssignmentData = {
      truckId: testTruck1.truckId,
      userId: driverAuthUser.uid,
      employeeId: driverUserEmployee.employeeId,
      loadoutId: "FakeLoadoutId"
    };
    const newAssignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, newAssignmentData);

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`;

    // Create assignment with an unassigned date
    const endedAssignment = {
      ...newAssignment,
      unassignedAt: new Date(),
    };

    // End service via PUT route
    // Updating the active assignment to end
    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${driverUserAuthToken}`
      },
      body: JSON.stringify(endedAssignment),
    });

    // Verify response is success
    expect(response.status).toBe(200);

    // Verify the truck document's assignedUserId was cleared
    const truckDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/trucks/${testTruck1.truckId}`).get();
    expect(truckDoc.data()?.assignedUserId).toBeNull();
  });

  // Test Case 4: Updating assignments of others without permission
  test('should fail if a user tries to update an assignment that is not theirs', async () => {

    // Assignment with driverUser as assignee
    const newAssignmentData = {
      truckId: testTruck1.truckId,
      userId: driverAuthUser.uid,
      employeeId: driverUserEmployee.employeeId,
      loadoutId: "FakeLoadOutID"
    };

    // Create an active assignment with driverUser as assignee
    const newAssignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, newAssignmentData);
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`;

    // Create assignment with an unassigned date
    const endedAssignment = {
      ...newAssignment,
      unassignedAt: new Date(),
    };

    // Try to end driverUser1's assignment as driverUser2.
    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session-token=${driverUser2AuthToken}` // Authenticated as driver 2
      },
      body: JSON.stringify(endedAssignment),
    });

    // Verify response if forbidden
    expect(response.status).toBe(403); // Forbidden
  });

  // DELETE route

  // Test Case 5: Successful deletion of assignment by employee assigned
  test('should allow a user to delete an assignment they created', async () => {
    // Create an active assignment for the driver
    const newAssignmentData = {
      truckId: testTruck1.truckId,
      userId: driverAuthUser.uid,
      employeeId: driverUserEmployee.employeeId,
      loadoutId: "FakeLoadOutID",
    };
    const newAssignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, newAssignmentData);

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`;
    
    // Delete assignment via DELETE route
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${driverUserAuthToken}` },
    });

    // Verify the API response is successful.
    expect(response.status).toBe(200);
    
    // Verify the document was actually deleted from Firestore.
    const assignmentDocRef = adminDb.doc(`organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`);
    const docSnap = await assignmentDocRef.get();
    expect(docSnap.exists).toBe(false);

    // Verify the truck was made available again
    const truckDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/trucks/${testTruck1.truckId}`).get();
    expect(truckDoc.data()?.assignedUserId).toBeNull();
  });


  // Test Case 6: Successful deletion of assignment by employee assigned
  test('should fail if a user tries to delete an assignment that is not theirs', async () => {

    // Assignment with driverUser as assignee
    const newAssignmentData = {
      truckId: testTruck1.truckId,
      userId: driverAuthUser.uid,
      employeeId: driverUserEmployee.employeeId,
      loadoutId: "FakeLoadOutID"
    };

    // Create an active assignment with driverUser as assignee
    const newAssignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, newAssignmentData);

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/assignments/${newAssignment.assignmentId}`;
    
    // driverUser2 tries to delete driverUser's assignment.
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${driverUser2AuthToken}` }, // Authenticated as driver 2
    });

    // Verify response is forbidden
    expect(response.status).toBe(403); // Forbidden
  });

});