import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { addAssignmentToOrg, addCalibrationReportToOrg, addChartToOrg, addEmployeeToOrg, addRoleToOrg, addTruckToOrg, addUser, createOrganization, } from "@/api/firebase/firebaseService";
import { CalibrationChart, ORGANIZATION_RESOURCES, Role, TankType, Truck, } from "@/api/database/database";
import { UserRecord } from 'firebase-admin/auth';

// API endpoints used for testing
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Client auth instance needed to get an ID token
const authClient = getAuth();

describe('Calibration Reports API Route E2E Tests', () => {

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

  const testTruck: Truck = {
    name: "Report Truck",
    truckId: "TRUCK-R1",
    tankType: TankType.SINGLE,
    chartId: "chart-report-1",
    assignedUserId: null,
  };
  
  const testChart: CalibrationChart = {
      chartId: "chart-report-1",
      name: "Report Chart",
      productTable: [{ measurement: 100, volume: 500 }, { measurement: 110, volume: 550 }],
  };

  let adminAuthUser: UserRecord;
  let driverAuthUser: UserRecord;

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
      adminAuthUser = await adminAuth.createUser(testAdminUser);
      driverAuthUser = await adminAuth.createUser(testDriverUser);

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

      // Add test truck and it's chart to testOrg1
      await addTruckToOrg(adminUserAuthToken, testOrg1.organizationId, testTruck);
      await addChartToOrg(adminUserAuthToken, testOrg1.organizationId, testChart);

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
    try {
      await clearFirestoreAuth();
      await clearFirestoreDB();
      await adminDb.terminate();
    } catch (e) {
      console.error("Error during afterAll cleanup:", e);
    }
  });

  // POST

  // Test Case 1: Successful Report Creation
  test('should successfully create a calibration report', async () => {

    // Create an assignment for driver user on testTruck
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
      employeeId: driverUserEmployee.employeeId,
      truckId: testTruck.truckId,
      userId: driverAuthUser.uid,
    });
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationReports`;
    
    const reportData = {
      truckId: testTruck.truckId,
      assignmentId: assignment.assignmentId,
      productMeasurement: 100,
    };

    // Create calibrationReport via POST
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(reportData),
    });

    // Verify response is success
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.data.calculatedProductVolume).toBe(500);

    // Verify the report was created in Firestore
    const reportId = responseBody.data.reportId;
    const reportDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/calibrationReports/${reportId}`).get();
    expect(reportDoc.exists).toBe(true);
    expect(reportDoc.data()?.createdBy).toBe(driverAuthUser.uid);
  });

    // Test Case 4: Fail if truckId does not exist
  test('should fail with a 400 Bad Request if the truckId does not exist', async () => {

    // Create an assignment for driver user on testTruck
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
      employeeId: driverUserEmployee.employeeId,
      truckId: testTruck.truckId,
      userId: driverAuthUser.uid,
    });

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationReports`;
    
    const reportData = {
      truckId: "GHOST-TRUCK", // This truck was never created
      assignmentId: assignment.assignmentId,
      product1Measurement: 100,
    };

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(reportData),
    });

    // Verify reponse is bad request
    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('fail');
  });

  // Test Case 5: Fail if assignmentId does not exist
  test('should fail with a 400 Bad Request if the assignmentId does not exist', async () => {
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationReports`;
    
    const reportData = {
      truckId: testTruck.truckId,
      assignmentId: "GHOST-ASSIGNMENT", // This assignment was never created
      product1Measurement: 100,
    };

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(reportData),
    });

    // Verify reponse is bad request
    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('fail');
  });

  // PUT

  // Test Case 2: Successful Report Update
  test('should successfully update an existing calibration report', async () => {
    // Create an assignment for driver user on testTruck
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
      employeeId: driverUserEmployee.employeeId,
      truckId: testTruck.truckId,
      userId: driverAuthUser.uid,
    });
    // Add report to organization
    const report = await addCalibrationReportToOrg(driverUserAuthToken, testOrg1.organizationId, {
      truckId: testTruck.truckId,
      assignmentId: assignment.assignmentId,
      productMeasurement: 100,
    });

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationReports/${report.reportId}`;
    
    const updatedData = {
      productMeasurement: 110, // Change the measurement
    };

    // Update the report via PUT
    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(updatedData),
    });

    // Verify response is success
    expect(response.status).toBe(200);

    // Verify the report was updated in Firestore
    const reportDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/calibrationReports/${report.reportId}`).get();
    // Note: The volume is NOT recalculated on update in the current service logic. This test reflects that.
    expect(reportDoc.data()?.productMeasurement).toBe(110);
  });
  
  // Test Case 3: Successful Report Deletion
  test('should successfully delete an existing calibration report', async () => {
    // Create an assignment for driver user on testTruck
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg1.organizationId, {
      employeeId: driverUserEmployee.employeeId,
      truckId: testTruck.truckId,
      userId: driverAuthUser.uid,
    });
    // Add report to organization
    const report = await addCalibrationReportToOrg(driverUserAuthToken, testOrg1.organizationId, {
      truckId: testTruck.truckId,
      assignmentId: assignment.assignmentId,
      productMeasurement: 100,
    });
    
    const reportDocRef = adminDb.doc(`organizations/${testOrg1.organizationId}/calibrationReports/${report.reportId}`);
    expect((await reportDocRef.get()).exists).toBe(true); // Verify it exists before deleting

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationReports/${report.reportId}`;

    // Delete via DELETE route
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${driverUserAuthToken}` },
    });
    
    // Verify response is successful
    expect(response.status).toBe(200);

    // Verify the report was deleted from Firestore
    const docSnap = await reportDocRef.get();
    expect(docSnap.exists).toBe(false);
  });
});
