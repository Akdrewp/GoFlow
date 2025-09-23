import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { createOrganization, addRoleToOrg, addEmployeeToOrg, addUser, addChartToOrg } from "@/api/firebase/firebaseService";
import { CalibrationChart, ORGANIZATION_RESOURCES, Role } from "@/api/database/database";

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

  // POST route

  // Test Case 1: Successful Chart Creation
  test('should successfully add a new calibration chart to an organization', async () => {
    const newChartData: CalibrationChart = {
      chartId: "SUCCESS-ID",
      name: "Model X Single Tank Chart",
      productTable: [{ measurement: 10, volume: 50 }, { measurement: 20, volume: 100 }],
    };
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationCharts`;

    // Add via calibrationCharts POST route
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(newChartData),
    });

    // Verify response is success
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('success');
    
    const chartDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/calibrationCharts/${newChartData.chartId}`).get();
    expect(chartDoc.exists).toBe(true);
    expect(chartDoc.data()?.name).toBe(newChartData.name);
  });

  // Test Case 2: Duplicate Chart ID
  test('should fail with a 409 Conflict if the chart ID already exists', async () => {
    const chartData: CalibrationChart = {
      chartId: "DUPLICATE-ID",
      name: "Model X Single Tank Chart",
      productTable: [],
    };

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationCharts`;
    
    // Add via calibrationCharts POST route
    await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(chartData),
    });
    
    // Add AGAIN via POST route
    const responseConflict = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(chartData),
    });

    // Verify response is conflict
    expect(responseConflict.status).toBe(409);
  });

  // PUT route

  // Test Case 3: Successful Chart Update
  test('should successfully update an existing chart', async () => {
    const initialChartData: CalibrationChart = {
      chartId: "UPDATE-ID",
      name: "Old Chart Name",
      productTable: [],
    };
    
    // Add to database
    await addChartToOrg(adminUserAuthToken, testOrg1.organizationId, initialChartData);

    const updatedChartData: CalibrationChart = {
      ...initialChartData,
      name: "New Chart Name",
    };
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationCharts/${initialChartData.chartId}`;

    // Update chart via PUT route
    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(updatedChartData),
    });

    // Verify response is success
    expect(response.status).toBe(200);
    
    // Check chart is updated in database
    const chartDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/calibrationCharts/${initialChartData.chartId}`).get();
    expect(chartDoc.data()?.name).toBe("New Chart Name");
  });

  // Test Case 4: Successful Chart Deletion
  test('should successfully delete an existing chart', async () => {
    const chartToDelete: CalibrationChart = {
      chartId: "CHART-TO-DELETE",
      name: "Delete Me",
      productTable: [],
    };


    const chartDocRef = adminDb.doc(`organizations/${testOrg1.organizationId}/calibrationCharts/${chartToDelete.chartId}`);
    
    // Add to database
    await addChartToOrg(adminUserAuthToken, testOrg1.organizationId, chartToDelete);

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/calibrationCharts/${chartToDelete.chartId}`;

    // Delete via DELETE route
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${adminUserAuthToken}` },
    });

    const responeJson = await response.json();

    console.log("calibrationCharts test 4 CONSOLE LOG responseJson.message: ", responeJson.message);

    // verify response is success
    expect(response.status).toBe(200);
    
    // Check chart is not in database
    const docSnap = await chartDocRef.get();
    expect(docSnap.exists).toBe(false);
  });


});
