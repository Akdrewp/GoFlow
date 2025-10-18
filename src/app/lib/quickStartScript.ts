import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Using relative imports for ts-node compatibility
import { clearFireStore } from "../../../e2e/cleanUpEmulators";
import { UserSignUpIndividual } from "../../../src/api/auth/authService";
import { Organization, Truck, TankType, CalibrationChart, Product, Loadout, MeasurementType, Role, ORGANIZATION_RESOURCES } from "../../../src/api/database/database";
import { firebaseAuthService } from "../../../src/api/firebase/firebaseAuthService";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../src/api/firebase/firebaseConfig";
import { createOrganization, addTruckToOrg, addProductToOrg, addChartToOrg, addLoadoutToOrg, addRoleToOrg, addAssignmentToOrg, addCalibrationReportToOrg, addEmployeeToOrg } from "../../../src/api/firebase/firebaseService";
import { adminAuth } from '@/api/firebase/firebaseAdmin';

// --- SEED DATA DEFINITIONS ---

const adminUserSignUp: UserSignUpIndividual = {
  name: "James Paul",
  email: "jamesterpaul@gmail.com",
  password: "password"
};

const mainOrg: Omit<Organization, "createdBy" | "createdAt"> = {
  email: adminUserSignUp.email,
  name: "Weedman",
  organizationId: "weed123",
};

// --- New Employee Data ---
const employeesToCreate = [
  { name: "Alice Johnson", email: "alice@goflow.com", employeeId: "EMP002" },
  { name: "Bob Williams", email: "bob@goflow.com", employeeId: "EMP003" },
  { name: "Charlie Brown", email: "charlie@goflow.com", employeeId: "EMP004" },
  { name: "Diana Miller", email: "diana@goflow.com", employeeId: "EMP005" },
  { name: "Ethan Davis", email: "ethan@goflow.com", employeeId: "EMP006" },
  { name: "Fiona Garcia", email: "fiona@goflow.com", employeeId: "EMP007" },
  { name: "George Rodriguez", email: "george@goflow.com", employeeId: "EMP008" },
  { name: "Hannah Wilson", email: "hannah@goflow.com", employeeId: "EMP009" },
];


// Helper function to generate prdocut chart data
function generateChartData(increments: number) {
  const measurementMin = 0;
  const measurementMax = 100;
  const volumeMin = 0;
  const volumeMax = 33;
  
  const table = [];
  
  const measurementStep = (measurementMax - measurementMin) / (increments - 1);
  const volumeStep = (volumeMax - volumeMin) / (increments - 1);

  for (let i = 0; i < increments; i++) {
    table.push({
      measurement: parseFloat((measurementMin + (i * measurementStep)).toFixed(2)),
      volume: parseFloat((volumeMin + (i * volumeStep)).toFixed(2))
    });
  }
  
  return table;
}

const defaultChart: CalibrationChart = {
  chartId: "default-chart-1",
  name: "Default Single Tank Chart",
  productTable: generateChartData(20),
};

const liquidProduct: Product = {
    productId: "FIESTA-SUMMER",
    name: "Fiesta Summer",
    measurementType: MeasurementType.CALIBRATED,
    targetRate: 0.00036,
    unitName: "Cm",
};

const unitProduct: Product = {
    productId: "bags-b",
    name: "Fertilizer Bags",
    measurementType: MeasurementType.UNIT_COUNT,
    targetRate: 0.00018,
    unitName: "Kg (Bags used * 25)",
};

const standardLoadout: Loadout = {
    loadoutId: "standard-loadout",
    name: "Standard Mix",
    productIds: [liquidProduct.productId, unitProduct.productId],
};

const mainTruck: Truck = {
  name: "Main Truck",
  truckId: "TRUCK-01",
  tankType: TankType.SINGLE,
  chartId: defaultChart.chartId,
  assignedUserId: null
};

// Used for getting variance close to calibration rates
function sigmoid(z: number, k: number) {
  const result = 1 / (1 + Math.exp(-z/k));
  console.log("Sigmoid result: ", result);
  return result;
}

// --- ADDED 6 MORE TRUCKS ---
const truck2: Truck = { name: "Truck 2", truckId: "TRUCK-02", tankType: TankType.SINGLE, chartId: defaultChart.chartId, assignedUserId: null };
const truck3: Truck = { name: "Truck 3", truckId: "TRUCK-03", tankType: TankType.SINGLE, chartId: defaultChart.chartId, assignedUserId: null };
const truck4: Truck = { name: "Truck 4", truckId: "TRUCK-04", tankType: TankType.SPLIT, chartId: defaultChart.chartId, assignedUserId: null };
const truck5: Truck = { name: "Truck 5", truckId: "TRUCK-05", tankType: TankType.SPLIT, chartId: defaultChart.chartId, assignedUserId: null };
const truck6: Truck = { name: "Truck 6", truckId: "TRUCK-06", tankType: TankType.SINGLE, chartId: defaultChart.chartId, assignedUserId: null };
const truck7: Truck = { name: "Truck 7", truckId: "TRUCK-07", tankType: TankType.SINGLE, chartId: defaultChart.chartId, assignedUserId: null };


async function setup() {
  try {
    console.log("Starting setup...");

    await clearFireStore();
    console.log("Cleared DB and Auth");


    // Signup with adminUser
    await firebaseAuthService.signUp.signUpUser(adminUserSignUp);
    console.log("Admin user signed up.");

    // Get adminUser token
    const adminUserAuth = await signInWithEmailAndPassword(auth, adminUserSignUp.email, adminUserSignUp.password);
    const adminUserAuthToken = await adminUserAuth.user.getIdToken();
    const adminUid = adminUserAuth.user.uid;
    console.log("Admin user token obtained.");

    // Create organization with adminUser as owner
    await createOrganization(adminUserAuthToken, {
      ...mainOrg,
      createdBy: adminUid,
      createdAt: new Date(),
    });
    console.log("Main organization created.");

    // --- Add New Resources ---
    
    await addChartToOrg(adminUserAuthToken, mainOrg.organizationId, defaultChart);
    console.log(`Chart "${defaultChart.chartId}" added to organization.`);

    await addProductToOrg(adminUserAuthToken, mainOrg.organizationId, liquidProduct);
    await addProductToOrg(adminUserAuthToken, mainOrg.organizationId, unitProduct);
    console.log("Sample products added to organization.");

    await addLoadoutToOrg(adminUserAuthToken, mainOrg.organizationId, standardLoadout);
    console.log(`Loadout "${standardLoadout.loadoutId}" added to organization.`);

    const allTrucks = [mainTruck, truck2, truck3, truck4, truck5, truck6, truck7];
    for (const truck of allTrucks) {
      await addTruckToOrg(adminUserAuthToken, mainOrg.organizationId, truck);
      console.log(`Truck "${truck.truckId}" added to organization.`);
    }

    // Create a driver permissions object with limited access
    const driverPermissions = ORGANIZATION_RESOURCES.reduce((accumulator, resource) => {
      if (resource == "assignments" || resource == 'calibrationReports' || resource == 'loadouts') {
        accumulator[resource] = { read: true, write: false };
      } else {
        accumulator[resource] = { read: true, write: true };
      }
      return accumulator;
    }, {} as Role['permissions']); // Start with an empty object of the correct type

    // --- Add and Activate New Employees ---
    const driverRole: Role = {
      name: "Driver",
      roleId: "driver",
      level: 50,
      permissions: driverPermissions
    };
    await addRoleToOrg(adminUserAuthToken, mainOrg.organizationId, driverRole);
    console.log("Driver role created.");

    // This array will hold the credentials of the newly created drivers
    const createdDrivers = [];

    for (const emp of employeesToCreate) {

      // Add as invited employee
      await addEmployeeToOrg(adminUserAuthToken, mainOrg.organizationId, {
        ...emp,
        roleId: driverRole.roleId,
      });

      // Signup user with organization
     await firebaseAuthService.signUp.signUpUser({ 
        ...emp, 
        organizationId: mainOrg.organizationId, 
        password: "password" 
      });

      // Signin using auth
      const userCredential = await signInWithEmailAndPassword(auth, emp.email, "password");
      const user = userCredential.user;
      const token = await user.getIdToken();
      createdDrivers.push({ ...emp, uid: user.uid, token });
      
      console.log(`Employee "${emp.name}" signed up and activated.`);
    }

    // --- Assign each employee to a truck ---
    console.log("\nAssigning employees to trucks and generating reports...");
    for (let i = 0; i < createdDrivers.length && i < allTrucks.length; i++) {
      const driver = createdDrivers[i];
      const truck = allTrucks[i];

      const assignment = await addAssignmentToOrg(driver.token, mainOrg.organizationId, {
        truckId: truck.truckId,
        userId: driver.uid,
        employeeId: driver.employeeId,
        loadoutId: standardLoadout.loadoutId,
      });

      console.log(`   - Assigned ${driver.name} to ${truck.name}`);

      // --- Generate 8-10 reports for this assignment ---


      let totalArea = 0;
      console.log(`     - Generating reports for ${driver.name}...`);
      const reportCount = 8 + Math.floor(Math.random() * 3); // 8, 9, or 10 reports
      for (let j = 0; j < reportCount; j++) {
        const area = j === 0 ? 0 : sigmoid(Math.random(), 0.9) * 1500 * j; // First report has 0 area
        totalArea = totalArea + area;

        // Report for liquid product
        await addCalibrationReportToOrg(driver.token, mainOrg.organizationId, {
            truckId: truck.truckId,
            assignmentId: assignment.assignmentId,
            productId: liquidProduct.productId,
            productMeasurement: 100 - j * 5, // Measurement decreases over time
            areaCompleted: totalArea
        });

        // Report for unit product
        await addCalibrationReportToOrg(driver.token, mainOrg.organizationId, {
            truckId: truck.truckId,
            assignmentId: assignment.assignmentId,
            productId: unitProduct.productId,
            productMeasurement: 100 - j * 0.75, // Measurement decreases over time
            areaCompleted: totalArea
        });
      }
    }

    console.log("\n✅ Setup complete!");

  } catch (error) {
    console.error("An error occurred during setup:", error);
  }
}

// Run the setup function
void setup();

