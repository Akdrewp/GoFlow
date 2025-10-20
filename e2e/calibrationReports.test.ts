import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { addEmployeeToOrg, addRoleToOrg, addUser, createOrganization, addTruckToOrg, addChartToOrg, addAssignmentToOrg, addCalibrationReportToOrg, addProductToOrg } from "@/api/firebase/firebaseService";
import { CalibrationChart, MeasurementType, ORGANIZATION_RESOURCES, Product, Role, TankType, Truck } from "@/api/database/database";
import { UserRecord } from "firebase-admin/auth";

// API endpoints used for testing
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Client auth instance needed to get an ID token
const authClient = getAuth();

describe('Calibration Reports API Route E2E Tests', () => {

  const testAdminUser = {
    email: "report-admin@test.com",
    name: "Report Admin",
    password: "securePassword123",
  };

  const testDriverUser = {
    email: "report-driver@test.com",
    name: "Report Driver",
    password: "securePassword123",
  };

  const testOrg = {
    name: "TestCo Reports",
    email: "contact@testcoreports.com",
    organizationId: "REPORTTEST123"
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
      productTable: [
        { measurement: 100, volume: 500 }, 
        { measurement: 110, volume: 550 },
        { measurement: 120, volume: 600 },
    ],
  };

  const productA: Product = {
    productId: "product-a",
    name: "Product A",
    measurementType: MeasurementType.CALIBRATED,
    targetRate: 10,
    unitName: "Liters",
  };

  let driverAuthUser: UserRecord;
  let adminUserAuthToken: string;
  let driverUserAuthToken: string;

  beforeEach(async () => {
    try {
      await clearFirestoreAuth();
      await clearFirestoreDB();
      
      const adminAuthUser = await adminAuth.createUser(testAdminUser);
      driverAuthUser = await adminAuth.createUser(testDriverUser);

      adminUserAuthToken = await adminAuth.createSessionCookie(await (await signInWithEmailAndPassword(authClient, testAdminUser.email, testAdminUser.password)).user.getIdToken(), { expiresIn: 60 * 60 * 1000});
      driverUserAuthToken = await adminAuth.createSessionCookie(await (await signInWithEmailAndPassword(authClient, testDriverUser.email, testDriverUser.password)).user.getIdToken(), { expiresIn: 60 * 60 * 1000});;

      await addUser({ ...testAdminUser, uid: adminAuthUser.uid, createdAt: new Date(), type: 'individual' });

      await createOrganization(adminUserAuthToken, {
        ...testOrg,
        createdBy: adminAuthUser.uid,
        createdAt: new Date(),
      });

      await addTruckToOrg(adminUserAuthToken, testOrg.organizationId, testTruck);
      await addChartToOrg(adminUserAuthToken, testOrg.organizationId, testChart);
      await addProductToOrg(adminUserAuthToken, testOrg.organizationId, productA);

      // Create a driver permissions object with full access
      const driverPermissions = ORGANIZATION_RESOURCES.reduce((accumulator, resource) => {
        accumulator[resource] = { read: true, write: true };
        return accumulator;
      }, {} as Role['permissions']); // Start with an empty object of the correct type
      

      const driverRole: Role = {
        name: "Driver", roleId: "driver", level: 50,
        permissions: driverPermissions,
      };
      await addRoleToOrg(adminUserAuthToken, testOrg.organizationId, driverRole);

      const driverUserEmployee = { name: testDriverUser.name, roleId: "driver", status: "invited" as const, employeeId: "2" };
      await addEmployeeToOrg(adminUserAuthToken, testOrg.organizationId, driverUserEmployee);

      await addUser({
        ...testDriverUser,
        uid: driverAuthUser.uid,
        createdAt: new Date(),
        organizationId: testOrg.organizationId,
        employeeId: driverUserEmployee.employeeId,
        type: 'organization'
      });

    } catch (e) {
      console.error("Critical Error during beforeEach setup:", e);
      throw e;
    }
  });

  afterAll(async () => {
    // await clearFirestoreAuth();
    // await clearFirestoreDB();
  });

  // POST

  // Test Case 1: Successful First Report Creation
  test('should successfully create the first calibration report for a truck', async () => {
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId,
      userId: driverAuthUser.uid,
      employeeId: "2",
      loadoutId: "default-loadout"
    });
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/calibrationReports`;
    
    const reportData = {
      truckId: testTruck.truckId,
      assignmentId: assignment.assignmentId,
      productId: productA.productId,
      productMeasurement: 100,
      areaCompleted: 0, // Area must be 0 for the first report
    };

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(reportData),
    });

    // Verify response is success
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('success');
    // For the first report, product used and rate must be 0
    expect(responseBody.data.productUsed).toBe(0);
    expect(responseBody.data.actualCalibrationRate).toBe(0);
  });

  // Test Case 2: Correct Calculation on Subsequent Report
  test('should correctly calculate productUsed and actualCalibrationRate on a subsequent report', async () => {
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, userId: driverAuthUser.uid, employeeId: "2", loadoutId: "default-loadout"
    });

    // Create initial report with measurement of 120 and area of 0
    await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId,
      assignmentId: assignment.assignmentId,
      productId: productA.productId,
      productMeasurement: 120, // Corresponds to 600 volume
      areaCompleted: 0,
    });

    // Create new report
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/calibrationReports`;
    const newReportData = {
      truckId: testTruck.truckId,
      assignmentId: assignment.assignmentId,
      productId: productA.productId,
      productMeasurement: 100, // Corresponds to 500 volume
      areaCompleted: 20,
    };

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(newReportData),
    });

    // Verify response is success
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('success');
    
    // Previous Volume (600) - Current Volume (500) = 100
    expect(responseBody.data.productUsed).toBe(100); 

    // Product Used (100) / Area (20) = 5
    const expectedRate = 100 / 20;
    expect(responseBody.data.actualCalibrationRate).toBeCloseTo(expectedRate, 3);
  });

  // Test Case 3: Business Logic Failure (Increasing Measurement)
  test('should fail if product measurement is greater than the initial measurement', async () => {
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, userId: driverAuthUser.uid, employeeId: "2", loadoutId: "default-loadout"
    });

    // 1. Create the initial report with a measurement of 100.
    await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 100, areaCompleted: 0,
    });

    // 2. Attempt to create a new report with a measurement of 110 (which is greater).
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/calibrationReports`;
    const invalidReportData = {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 110, areaCompleted: 10,
    };

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(invalidReportData),
    });

    // 3. Assert that the API correctly rejects the request.
    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.message).toContain("Product measurement cannot be greater than the initial measurement");
  });

  // PUT

  // Test Case 4: Update with Recalculation
  test('should recalculate productUsed and rate when a report is updated', async () => {
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, userId: driverAuthUser.uid, employeeId: "2", loadoutId: "default-loadout"
    });
    
    // Create the two reports.
    await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 120, areaCompleted: 0, // Initial volume: 600
    });
    const secondReport = await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 110, areaCompleted: 10, // Initial volume: 550, Used: 50
    });

    // Update the second report's measurement.
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/calibrationReports/${secondReport.reportId}`;
    const updatedData = { productMeasurement: 100 }; // New volume should be 500


    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(updatedData),
    });

    expect(response.status).toBe(200);

    // 3. Verify the report was updated with recalculated values.
    const reportDoc = await adminDb.doc(`organizations/${testOrg.organizationId}/calibrationReports/${secondReport.reportId}`).get();
    const data = reportDoc.data();

    expect(data?.productMeasurement).toBe(100);
    expect(data?.productUsed).toBe(100); // Recalculated: 600 - 500
    expect(data?.actualCalibrationRate).toBeCloseTo(10, 3); // Recalculated: 100 / 10
  });

  // Test Case 5: Update with Cascading Recalculation
  test('should recalculate all subsequent reports when an initial report is updated', async () => {
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, userId: driverAuthUser.uid, employeeId: "2", loadoutId: "default-loadout"
    });
    
    // Create a chain of three reports.
    const firstReport = await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 120, areaCompleted: 0, // Initial volume: 600
    });
    const secondReport = await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 110, areaCompleted: 10, // Vol: 550, Used: 50, Rate: 0.2
    });
    const thirdReport = await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
        truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
        productId: productA.productId, productMeasurement: 100, areaCompleted: 5, // Vol: 500, Used: 50, Rate: 0.1
    });

    // Update the VERY FIRST report's measurement.
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/calibrationReports/${firstReport.reportId}`;
    const updatedData = { productMeasurement: 110 }; // New initial volume should be 550

    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${driverUserAuthToken}` },
      body: JSON.stringify(updatedData),
    });

    expect(response.status).toBe(200);

    // Verify that the subsequent reports have been automatically recalculated.
    const secondReportDoc = await adminDb.doc(`organizations/${testOrg.organizationId}/calibrationReports/${secondReport.reportId}`).get();
    const secondData = secondReportDoc.data();
    expect(secondData?.productUsed).toBe(0); // Recalculated: 550 (new first) - 550 (second)
    expect(secondData?.actualCalibrationRate).toBe(0);

    const thirdReportDoc = await adminDb.doc(`organizations/${testOrg.organizationId}/calibrationReports/${thirdReport.reportId}`).get();
    const thirdData = thirdReportDoc.data();
    expect(thirdData?.productUsed).toBe(50); // Recalculated: 550 (new second) - 500 (third)
    expect(thirdData?.actualCalibrationRate).toBeCloseTo(10, 3); // 50 / 5
  });

  // Delete
  
  // Test Case 6: Successful Report Deletion
  test('should successfully delete an existing calibration report', async () => {
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, userId: driverAuthUser.uid, employeeId: "2", loadoutId: "default-loadout"
    });
    // Create the initial report and a subsequent one.
    await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 120, areaCompleted: 0,
    });
    const secondReport  = await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 110, areaCompleted: 10,
    });
    
    const reportDocRef = adminDb.doc(`organizations/${testOrg.organizationId}/calibrationReports/${secondReport.reportId}`);
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/calibrationReports/${secondReport.reportId}`;

    // Delete second report via API
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${driverUserAuthToken}` },
    });
    
    // Verify response is success
    expect(response.status).toBe(200);

    // Verify document was deleted
    const docSnap = await reportDocRef.get();
    expect(docSnap.exists).toBe(false);
  });

  // Test Case 7: Deleting initial report fails
  test('should fail with a 403 Forbidden error if deleting the initial report', async () => {
    const assignment = await addAssignmentToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, userId: driverAuthUser.uid, employeeId: "2", loadoutId: "default-loadout"
    });
    
    // Create the initial report and a subsequent one.
    const firstReport = await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 120, areaCompleted: 0,
    });
    await addCalibrationReportToOrg(driverUserAuthToken, testOrg.organizationId, {
      truckId: testTruck.truckId, assignmentId: assignment.assignmentId,
      productId: productA.productId, productMeasurement: 110, areaCompleted: 10,
    });
    
    // Attempt to delete the FIRST report.
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/calibrationReports/${firstReport.reportId}`;
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${driverUserAuthToken}` },
    });
    
    // Verify response is Forbidden
    expect(response.status).toBe(403);
    const responseBody = await response.json();
    expect(responseBody.message).toContain("The initial report of an assignment cannot be deleted");

    // Verify the report was NOT deleted.
    const reportDoc = await adminDb.doc(`organizations/${testOrg.organizationId}/calibrationReports/${firstReport.reportId}`).get();
    expect(reportDoc.exists).toBe(true);
  });
});

