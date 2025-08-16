import "server-only";

import { z } from "zod";

import { collection, doc, setDoc, getDoc, updateDoc, getDocs, query, where, DocumentData} from "firebase/firestore";
import { db } from "./firebaseConfig";

import { UserProfile, Organization, Employee } from "@/api/database/database";

export class firebaseDatabaseError extends Error {}

export const userDatabase = {
  /**
   * Adds or updates a user's profile information in the 'users' collection.
   * @param userProfile - The user's profile data.
   * @returns A Promise that resolves when the operation is complete.
   * @throws Error if userProfile includes orgnaizationId and employeeId
   * but orgnization does not exist, employee does not exist, or
   * employee already has an associated account.
   */
  add: async (userProfile: UserProfile): Promise<void> => {
    try {
      // If signing up with organization
      if(userProfile.employeeId && userProfile.organizationId) {

        // If organization does not exist
        if ( !(await organizationDatabase.exists(userProfile.organizationId)) ) {
          throw new firebaseDatabaseError("Organization with passed organizationId does not exist");
        }

        // Check if employee exists and is not associated with any user yet
        const employeeExistsInOrg = await employeeDatabase.existsInOrg(userProfile.organizationId, userProfile.employeeId);
        const isEmployeeAlreadyAssociated = await employeeDatabase.isAssociated(userProfile.employeeId);
        if (employeeExistsInOrg) {
          if (isEmployeeAlreadyAssociated) {
            throw new firebaseDatabaseError("Employee with passed employeeId already associated with an account");
          }

          // User is in organization and is not associated with an organization yet
          // Activate user with user information
          await employeeDatabase.activate(userProfile.organizationId, userProfile.employeeId, userProfile.uid);
        } else {
          // Organization exists but employee id is not in organization
          throw new firebaseDatabaseError("Employee with passed employeeId does not exist in this organization");

        }
      }
      await setDoc(doc(db, "users", userProfile.uid), {
        name: userProfile.name,
        email: userProfile.email,
        uid: userProfile.uid,
        ...(userProfile.organizationId && { organizationId: userProfile.organizationId }),
        ...(userProfile.employeeId && { employeeId: userProfile.employeeId }),
        createdAt: userProfile.createdAt || new Date(),
      });
      console.log("User document added/updated with UID:", userProfile.uid);
    } catch (e) {

      console.error("Error adding user to database:", e);

      if (e instanceof firebaseDatabaseError) {
        throw(e);
      } else {
        throw new Error(`Failed to add user to database: ${(e as Error).message || 'Unknown error'}`);
      }
    }
  },

  /**
   * Fetches a user's profile from the 'users' collection by their UID.
   * @param uid - The user's Firebase Auth UID.
   * @returns A Promise resolving to the UserProfile if found
   * @throws Error if user is not found
   */
  get: async (uid: string): Promise<UserProfile> => {
    try {
      /**
       * @todo use of getDoc in these methods probably should delegate to firebaseVerify
       */
      const userDocRef = doc(db, "users", uid);
      const docSnap = await getDoc(userDocRef);

      // It's a good practice to validate the data with Zod here before casting
      return docSnap.data() as UserProfile;
    } catch (e) {
      console.error(`Error getting user profile for UID ${uid}:`, e);
      throw new Error(`Failed to get user profile: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * @param updateUserProfile new user profile to follow
   */
};

export const organizationDatabase = {
  /**
   * Handles adding a new organization's details to the database.
   * @param organization - The organization's data.
   * @returns A Promise that resolves when the operation is complete.
   */
  add: async (organization: Organization): Promise<void> => {
    try {
      const orgDocId = organization.organizationId;
      const organizationDoc = doc(db, "organizations", orgDocId);

      // Create the organization document
      await setDoc(organizationDoc, {
        name: organization.name,
        email: organization.email,
        organizationId: organization.organizationId,
        createdBy: organization.createdBy,
        createdAt: organization.createdAt,
      });
    } catch (e) {
      console.error("Error adding organization to database:", e);
      throw new Error(`Failed to add organization to database: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * Checks if an organization with the given ID exists.
   * @param organizationId - The ID of the organization to check.
   * @returns A Promise resolving to true if the organization exists, false otherwise.
   */
  exists: async (customOrganizationId: string): Promise<boolean> => {
    try {
      // A direct get is more efficient than a query if the doc ID is the custom ID
      const orgDocRef = doc(db, "organizations", customOrganizationId);
      const docSnap = await getDoc(orgDocRef);
      return docSnap.exists();
    } catch (e) {
      console.error("Error checking organization existence:", e);
      throw new Error(`Failed to check organization existence: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * Adds employee with specified data to organization with organizationId
   * @param organizationId The organizationId of the organization to add employee to
   * @param employeeData Employee data
   * @returns A Promise resolving to true if the employee was added
   * @throws Error if employee could not be added
   */
  addEmployee: async (organizationId: string, employeeData: Employee): Promise<void> => {
    try {
      // The path is contextual to the organization
      const employeeDocRef = doc(db, `organizations/${organizationId}/employees`, employeeData.employeeId);
      
      await setDoc(employeeDocRef, {
        ...employeeData,
      });

      console.log(`Employee ${employeeData.employeeId} added to organization ${organizationId}`);
    } catch (e) {
      console.error("Error adding employee:", e);
      throw new Error(`Failed to add employee: ${(e as Error).message}`);
    }
  },
};

export const employeeDatabase = {
  /**
   * Checks if an employeeId is valid for a given organization.
   * @param organizationId - The ID of the organization.
   * @param employeeId - The employee ID to validate.
   * @returns A Promise resolving to true if the employeeId is valid, false otherwise.
   */
  existsInOrg: async (organizationId: string, employeeId: string): Promise<boolean> => {
    try {
      // This assumes employee records are stored in a sub-collection
      const employeesRef = collection(db, `organizations/${organizationId}/employees`);
      const q = query(employeesRef, where("employeeId", "==", employeeId));
      const querySnapshot = await getDocs(q);

      querySnapshot.docs.forEach((doc) => {
        console.log("employeeDatabase.existsInOrg CONSOLE LOG Doc data: ", doc.data());
      });

      return !querySnapshot.empty;
    } catch (e) {
      console.error("Error checking employee ID validity within organization:", e);
      throw new Error(`Failed to check employee ID validity: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * Checks if an employeeId is already associated with an existing user profile.
   * @param employeeId - The employee ID to check.
   * @returns A Promise resolving to true if a user with this employeeId already exists, false otherwise.
   */
  isAssociated: async (employeeId: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("employeeId", "==", employeeId));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (e) {
      console.error("Error checking if employee ID is already associated with a user:", e);
      throw new Error(`Failed to check employee ID association: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * Updates an existing employee record to link a Firebase Auth UID
   * and set their status to "active".
   * @param organizationId The ID of the organization.
   * @param employeeId The ID of the employee document.
   * @param uid The Firebase Auth UID of the user to link.
   */
  activate: async (organizationId: string, employeeId: string, uid: string): Promise<void> => {
    try {
      // Path to the specific employee document
      const employeeDocRef = doc(db, `organizations/${organizationId}/employees`, employeeId);
      
      // Use updateDoc to change only specific fields
      await updateDoc(employeeDocRef, {
        uid: uid,
        status: "active"
      });

      console.log(`Employee ${employeeId} in org ${organizationId} activated for user ${uid}.`);
    } catch (e) {
      console.error("Error activating employee:", e);
      throw new Error(`Failed to activate employee: ${(e as Error).message}`);
    }
  },
};

export const genericDatabase = {
  get: async (resourceId: string): Promise<DocumentData> => {

    // Get and return requested resource
    const docRef = doc(db, resourceId);
    const docData = await getDoc(docRef);
    return docData;
  },

  update: async <T extends z.ZodTypeAny>(resourceId: string, data: z.infer<T>, schema: T): Promise<void> => {

    //Make sure data conforms to schema
    const validation = schema.safeParse(data);
    if (!validation.success) {
      throw new Error("Data does not match passed schema: ", validation.error);
    }

    // Get docRef and update
    // This will throw an error if document doesn't exist
    const docRef = doc(db, resourceId);
    await updateDoc(docRef, data);
  }
};