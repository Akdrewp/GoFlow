import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";
import { clearFireStore, clearFirestoreAuth, clearFirestoreDB } from "./cleanUpEmulators";
import { addChartToOrg, addEmployeeToOrg, addRoleToOrg, addTruckToOrg, addUser, createOrganization, } from "@/api/firebase/firebaseService";
import { CalibrationChart, Loadout, MeasurementType, ORGANIZATION_RESOURCES, Product, Role, TankType, Truck, } from "@/api/database/database";
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

  const productA: Product = {
    productId: "product-a",
    name: "Product A",
    measurementType: MeasurementType.CALIBRATED,
    targetRate: 10,
    unitName: "Liters",
  };
  
  const productB: Product = {
    productId: "product-b",
    name: "Product B",
    measurementType: MeasurementType.UNIT_COUNT,
    targetRate: 5,
    unitName: "Bags",
  };

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

      // Add products to the organization to be used in loadouts
      await addProductToOrg(adminUserAuthToken, testOrg1.organizationId, productA);
      await addProductToOrg(adminUserAuthToken, testOrg1.organizationId, productB);

    } catch (e) {
      console.error("Critical Error during beforeEach setup:", e);
      throw e;
    }
  });

  afterAll(async () => {
    await clearFireStore();
  });

  // Test Case 1: Successful Loadout Creation (POST)
  test('should successfully create a new loadout', async () => {
    const newLoadout: Loadout = {
      loadoutId: "standard-loadout",
      name: "Standard Loadout",
      products: [productA.productId, productB.productId]
    };
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/loadouts`;

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(newLoadout),
    });

    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.status).toBe('success');

    // Verify the loadout was created in Firestore
    const loadoutDoc = await adminDb.doc(`organizations/${testOrg.organizationId}/loadouts/${newLoadout.loadoutId}`).get();
    expect(loadoutDoc.exists).toBe(true);
    expect(loadoutDoc.data()?.productIds).toEqual([productA.productId, productB.productId]);
  });

  // Test Case 2: Successful Loadout Update (PUT)
  test('should successfully update an existing loadout', async () => {
    const initialLoadout: Loadout = {
      loadoutId: "update-loadout",
      name: "Initial Name",
      productIds: [productA.productId]
    };
    await addLoadoutToOrg(adminUserAuthToken, testOrg.organizationId, initialLoadout);
    
    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/loadouts/${initialLoadout.loadoutId}`;
    
    const updatedData = {
      ...initialLoadout,
      name: "Updated Loadout Name", // Change the name
      productIds: [productB.productId] // Change the products
    };

    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': `session-token=${adminUserAuthToken}` },
      body: JSON.stringify(updatedData),
    });

    expect(response.status).toBe(200);

    // Verify the loadout was updated in Firestore
    const loadoutDoc = await adminDb.doc(`organizations/${testOrg.organizationId}/loadouts/${initialLoadout.loadoutId}`).get();
    expect(loadoutDoc.data()?.name).toBe("Updated Loadout Name");
    expect(loadoutDoc.data()?.productIds).toEqual([productB.productId]);
  });

  // Test Case 3: Successful Loadout Deletion (DELETE)
  test('should successfully delete an existing loadout', async () => {
    const loadoutToDelete: Loadout = {
      loadoutId: "delete-me-loadout",
      name: "To Be Deleted",
      productIds: []
    };
    await addLoadoutToOrg(adminUserAuthToken, testOrg.organizationId, loadoutToDelete);
    
    const loadoutDocRef = adminDb.doc(`organizations/${testOrg.organizationId}/loadouts/${loadoutToDelete.loadoutId}`);
    expect((await loadoutDocRef.get()).exists).toBe(true);

    const apiRoute = `${NEXT_PUBLIC_BASE_URL}/api/organizations/${testOrg.organizationId}/loadouts/${loadoutToDelete.loadoutId}`;

    const response = await fetch(apiRoute, {
      method: 'DELETE',
      headers: { 'Cookie': `session-token=${adminUserAuthToken}` },
    });
    
    expect(response.status).toBe(200);

    // Verify the loadout was deleted from Firestore
    const docSnap = await loadoutDocRef.get();
    expect(docSnap.exists).toBe(false);
  });

});
