import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
// This ensures they are available to your tests, especially for Admin SDK initialization.
// The path.resolve ensures the correct absolute path to your .env.local file.
// process.cwd() gets the current working directory, which should be your project root.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Using relative imports since ts-node doesn't accept alias @
// tsconfig-paths doesn't seem to work either
import { Organization, Truck, TankType } from "../../../src/api/database/database";
import { firebaseAuthService } from "../../../src/api/firebase/firebaseAuthService";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../src/api/firebase/firebaseConfig";
import { createOrganization, addTruckToOrg } from "../../../src/api/firebase/firebaseService";
import { UserSignUpIndividual } from "../../../src/api/auth/authService";

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

const mainTruck: Truck = {
  name: "Main Truck",
  truckId: "TRUCK-01",
  tankType: TankType.SINGLE,
  chartId: "default-chart-1",
  assignedUserId: null
};

async function setup() {
  try {
    console.log("Starting setup...");

    // Signup with adminUser
    await firebaseAuthService.signUp.signUpUser(adminUserSignUp);
    console.log("Admin user signed up.");

    // Get adminUser token
    const adminUserAuth = await signInWithEmailAndPassword(auth, adminUserSignUp.email, adminUserSignUp.password);
    const adminUserToken = await adminUserAuth.user.getIdToken();
    const adminUid = adminUserAuth.user.uid;
    console.log("Admin user token obtained.");

    // Create organization with adminUser as owner
    await createOrganization(adminUserToken, {
      ...mainOrg,
      createdBy: adminUid,
      createdAt: new Date(),
    });
    console.log("Main organization created.");

    // Add a truck to the organization
    await addTruckToOrg(adminUserToken, mainOrg.organizationId, mainTruck);
    console.log(`Truck "${mainTruck.truckId}" added to organization.`);

    console.log("Setup complete!");

  } catch (error) {
    console.error("An error occurred during setup:", error);
  }
}

// Run the setup function
void setup();
