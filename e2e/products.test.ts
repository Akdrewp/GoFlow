import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFireStore, clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { addChartToOrg, addEmployeeToOrg, addRoleToOrg, addTruckToOrg, addUser, createOrganization, } from "@/api/firebase/firebaseService";
import { CalibrationChart, MeasurementType, ORGANIZATION_RESOURCES, Product, Role, TankType, Truck, } from "@/api/database/database";
import { UserRecord } from 'firebase-admin/auth';
import { addProductToOrg } from "@/api/firebase/firebaseService/productService";

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
    await clearFireStore();
  });

  // POST

  // Test Case 1: Successful Product Creation
  test('should successfully create a new product', async () => {
    const newProduct: Product = {
      productId: "LIQUID-A",
      name: "Liquid Herbicide A",
      measurementType: MeasurementType.CALIBRATED,
      targetRate: 10.5,
      unitName: "Liters",
    };
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/products`;

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(newProduct),
    });

    // Verify response is success
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('success');

    // Verify the product was created in Firestore
    const productDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/products/${newProduct.productId}`).get();
    expect(productDoc.exists).toBe(true);
    expect(productDoc.data()?.name).toBe(newProduct.name);
  });

  // Test Case 2: Duplicate productId
  test('should fail with a 409 Conflict if the product ID already exists', async () => {
    const newProduct: Product = {
      productId: "DUPLICATE-ID",
      name: "Duplicate Product",
      measurementType: MeasurementType.UNIT_COUNT,
      targetRate: 1,
      unitName: "Units"
    };
    
    // Add product
    await addProductToOrg(adminUserAuthToken, testOrg1.organizationId, newProduct);

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/products`;

    // Add product again via POST route, should fail
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(newProduct),
    });

    // Verify response is conflict
    expect(response.status).toBe(409);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('fail');
  });

  // PUT 
  
  // Test Case 3: Successful Product Update
  test('should successfully update an existing product', async () => {
    // Create a product to update
    const initialProduct: Product = {
      productId: "LIQUID-B",
      name: "Old Product Name",
      measurementType: MeasurementType.CALIBRATED,
      targetRate: 5,
      unitName: "Liters"
    };
    await addProductToOrg(adminUserAuthToken, testOrg1.organizationId, initialProduct);
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/products/${initialProduct.productId}`;
    
    const updatedData = {
      ...initialProduct,
      name: "New and Improved Product Name" // Change the name
    };

    // Update via PUT route
    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(updatedData),
    });

    const responseBody = await response.json();
    console.log("products test case 3 CONSOLE LOG responseBody.message: ", responseBody.message);

    // Verify response is success
    expect(response.status).toBe(200);

    // Verify the product was updated in Firestore
    const productDoc = await adminDb.doc(`organizations/${testOrg1.organizationId}/products/${initialProduct.productId}`).get();
    expect(productDoc.data()?.name).toBe("New and Improved Product Name");
  });

  // Test Case 4: Update Non-Existent Product
  test('should fail with a 404 Not Found if updating a product that does not exist', async () => {
    const nonExistentProduct: Product = {
      productId: "GHOST-PRODUCT",
      name: "I do not exist",
      measurementType: MeasurementType.UNIT_COUNT,
      targetRate: 1,
      unitName: "Units",
    };
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/products/${nonExistentProduct.productId}`;

    // Attempt to update 'nonExistentProduct'
    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(nonExistentProduct),
    });

    // Verify response is Not Found
    expect(response.status).toBe(404);
  });

  // DELETE
  
  // Test Case 5: Successful Product Deletion
  test('should successfully delete an existing product', async () => {
    // Create a product to delete
    const productToDelete: Product = {
      productId: "DELETE-ME",
      name: "Product to be Deleted",
      measurementType: MeasurementType.UNIT_COUNT,
      targetRate: 1,
      unitName: "Each"
    };
    await addProductToOrg(adminUserAuthToken, testOrg1.organizationId, productToDelete);
    
    const productDocRef = adminDb.doc(`organizations/${testOrg1.organizationId}/products/${productToDelete.productId}`);
    expect((await productDocRef.get()).exists).toBe(true); // Verify it exists before deleting

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/products/${productToDelete.productId}`;

    // Delete via DELETE
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${adminUserAuthToken}` },
    });
    
    const responseBody = await response.json();
    console.log("products test case 5 CONSOLE LOG responseBody.message: ", responseBody.message);

    // Verify reponse is success
    expect(response.status).toBe(200);

    // Verify the product was deleted from Firestore
    const docSnap = await productDocRef.get();
    expect(docSnap.exists).toBe(false);
  });

  // Test Case 6: Delete Non-Existent Product
  test('should fail with a 404 Not Found if deleting a product that does not exist', async () => {
    const nonExistentProductId = "GHOST-PRODUCT-DELETE";
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg1.organizationId}/products/${nonExistentProductId}`;

    // Attempt to delete product with id 'GHOST-PRODUCT-DELETE'
    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${adminUserAuthToken}` },
    });

    // Verify reponse is not found
    expect(response.status).toBe(404);
  });

});
