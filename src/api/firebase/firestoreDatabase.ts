// import "server-only";

import { z } from "zod";

import { collection, doc, setDoc, getDoc, updateDoc, getDocs, query, where, DocumentData, deleteDoc} from "firebase/firestore";
import { db } from "./firebaseConfig";

import { UserProfile, Organization, Employee, Role, Truck, CalibrationChart } from "@/api/database/database";
import { AccessType } from "./firebaseVerify";

export class FirestoreDatabaseError extends Error {
  public readonly code: number;

  constructor(message: string, code: number) {
      super(message);
      this.name = "FirestoreDatabaseError";
      this.code = code;
  }
}

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

      // Add user to database
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
      // Re-throw a generic error for the service layer to handle.
      throw new Error(`Failed to add user to database: ${(e as Error).message}`);
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

      console.log("firestoreDatabase userDatabase get CONSOLE LOG getDoc(uid) = docSnap.data(): ", docSnap.data());

      // It's a good practice to validate the data with Zod here before casting
      return docSnap.data() as UserProfile;
    } catch (e) {
      console.error(`Error getting user profile for UID ${uid}:`, e);
      throw new Error(`Failed to get user profile: ${(e as Error).message || 'Unknown error'}`);
    }
  },

  /**
   * Updates an existing user's profile in the database.
   * @param uid The UID of the user to update.
   * @param userProfile An object containing the new profile data to apply.
   * @returns A Promise that resolves with the updated user profile data.
   * @throws An error if the user document does not exist or the update fails.
   * @todo not sure whether to use Partial for userProfile or require the entire
   * UserProfile objects
   */
  update: async (uid: string, userProfile: Partial<UserProfile>): Promise<UserProfile> => {

    try {
        const userDocRef = doc(db, "users", uid);
        
        // updateDoc will throw an error if the document doesn't exist.
        await updateDoc(userDocRef, userProfile);

        console.log(`User profile for UID ${uid} successfully updated.`);

        // Fetch the updated document to return the full, merged profile
        const updatedDoc = await getDoc(userDocRef);
        return updatedDoc.data() as UserProfile;

    } catch (e) {
        console.error(`Error updating user profile for UID ${uid}:`, e);
        throw new Error(`Failed to update user profile: ${(e as Error).message || 'Unknown error'}`);
    }
  }
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
   * Fetches a specific organization's document from the database.
   * @param organizationId - The unique ID of the organization to fetch.
   * @returns A Promise that resolves to the Organization object if found
   * @throws An error if the database read operation fails.
   */
  get: async (organizationId: string): Promise<Organization> => {
      try {
          const orgDocRef = doc(db, "organizations", organizationId);
          const docSnap = await getDoc(orgDocRef);

          if (!docSnap.exists()) {
              console.log(`Organization with ID "${organizationId}" not found.`);
              throw new FirestoreDatabaseError(
                `Organization with ID "${organizationId}" not found.`,
                400, // Bad Request
              );
          }

          return docSnap.data() as Organization;

      } catch (e) {
          console.error("Error getting organization from database:", e);
          throw new Error(`Failed to get organization: ${(e as Error).message}`);
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

  /**
   * Fetches a specific employee's data from an organization's sub-collection.
   * @param organizationId The ID of the organization the employee belongs to.
   * @param employeeId The ID of the employee to fetch.
   * @returns A Promise that resolves to the Employee object if found, otherwise null.
   * @throws An error if the database operation fails.
   */
  getEmployee: async (organizationId: string, employeeId: string): Promise<Employee> => {
      try {
          const employeeDocRef = doc(db, `organizations/${organizationId}/employees`, employeeId);
          
          const docSnap = await getDoc(employeeDocRef);

          if (!docSnap.exists()) {
              console.log(`Employee with ID ${employeeId} not found in organization ${organizationId}`);
              throw new FirestoreDatabaseError("Employee with pass employee id not found in organization", 400);
          }

          return docSnap.data() as Employee;

      } catch (e) {
          console.error("Error getting employee from database:", e);
          throw new Error(`Failed to get employee: ${(e as Error).message}`);
      }
  },

  /**
   * Adds a new role document to an organization's 'roles' sub-collection.
   * @param organizationId The ID of the organization to add the role to.
   * @param roleId The unique ID for the new role (will be used as the document ID).
   * @param roleData An object containing the role's data, such as its name and permissions map.
   * @returns A promise that resolves when the role has been successfully added.
   * @throws An error if the database write operation fails.
   */
  addRole: async (organizationId: string, roleData: Role): Promise<void> => {
    try {
      
      // Create path to role document in organization
      const roleDocPath = `organizations/${organizationId}/roles/${roleData.roleId}`;
      const roleDocRef = doc(db, roleDocPath);

      // Set role document in database
      await setDoc(roleDocRef, roleData);

      console.log(`Role "${roleData.roleId}" successfully added to organization "${organizationId}".`);

    } catch (error) {
      console.error(`Error adding role "${roleData.roleId}" to organization "${organizationId}":`, error);
      // Re-throw the error to be handled by the calling business logic layer.
      throw new Error(`Failed to add role: ${(error as Error).message}`);
    }
  },

  /**
   * Fetches a specific role document from an organization's 'roles' sub-collection.
   * @param organizationId The ID of the organization where the role is defined.
   * @param roleId The ID of the role to fetch.
   * @returns A promise that resolves to the Role object if found
   * @throws An error if the database read operation fails or the roleId does not exist in the organization
   */
  getRole: async (organizationId: string, roleId: string): Promise<Role> => {
      try {

          // Get roleDocPath
          const roleDocPath = `organizations/${organizationId}/roles/${roleId}`;
          const roleDocRef = doc(db, roleDocPath);

          // Fetch the document snapshot.
          const docSnap = await getDoc(roleDocRef);

          if (!docSnap.exists()) {
              console.log(`Role with ID "${roleId}" not found in organization "${organizationId}".`);
              throw new FirestoreDatabaseError(`Role with ID "${roleId}" not found in organization `, 400);
          }

          return docSnap.data() as Role;

      } catch (error) {
          console.error(`Error fetching role "${roleId}" from organization "${organizationId}":`, error);
          // Re-throw the error to be handled by the calling business logic layer.
          throw new Error(`Failed to fetch role: ${(error as Error).message}`);
      }
  },

  /**
   * Fetches all roles for a specific organization.
   * @param organizationId The ID of the organization from which to fetch roles.
   * @returns A promise that resolves to an array of Role objects. The array will be empty if no roles are found.
   * @throws An error if the database read operation fails.
   */
  getRoles: async (organizationId: string): Promise<Role[]> => {
      try {
          // Get roles DocPath
          const rolesCollectionPath = `organizations/${organizationId}/roles`;
          const rolesCollectionRef = collection(db, rolesCollectionPath);

          // Fetch the document snapshot.
          const querySnapshot = await getDocs(rolesCollectionRef);

          // If none found just return empty array
          // Shouldn't happen as there is always default admin
          // role but just in case
          if (querySnapshot.empty) {
              console.log(`No roles found for organization "${organizationId}".`);
              return [];
          }

          // Cast roleDocuments into Role objects
          const roles = querySnapshot.docs.map(doc => doc.data() as Role);

          return roles;

      } catch (error) {
          console.error(`Error fetching roles for organization "${organizationId}":`, error);
          // Re-throw the error to be handled by the calling business logic layer.
          throw new Error(`Failed to fetch roles: ${(error as Error).message}`);
      }
  },

  /**
   * Checks if a role with the given roleId exists within an organization.
   * @param organizationId The ID of the organization.
   * @param roleId The ID of the role to check.
   * @returns A Promise that resolves to true if the role exists, false otherwise.
   */
  roleExists: async (organizationId: string, roleId: string): Promise<boolean> => {
    try {
      // Get role document
      const roleDocRef = doc(db, `organizations/${organizationId}/roles`, roleId);
      const docSnap = await getDoc(roleDocRef);

      // Return whether it exists
      return docSnap.exists();
    } catch (e) {
      console.error(`Error checking if role "${roleId}" exists:`, e);
      throw new Error(`Failed to check for role existence: ${(e as Error).message}`);
    }
  },


};

export const truckDatabase = {
  /**
   * Checks if a truck with the given truckId exists within an organization's 'trucks' sub-collection.
   * @param organizationId The ID of the organization.
   * @param truckId The ID of the truck to check.
   * @returns A Promise that resolves to true if the truck exists, false otherwise.
   * @throws An error if the database read operation fails.
   */
  truckExists: async (organizationId: string, truckId: string): Promise<boolean> => {
    try {
      // Get truck dococument
      const truckDocRef = doc(db, `organizations/${organizationId}/trucks`, truckId);
      const docSnap = await getDoc(truckDocRef);

      // Return whether it exists
      return docSnap.exists();
    } catch (e) {
      console.error(`Error checking if truck "${truckId}" exists:`, e);
      throw new Error(`Failed to check for truck existence: ${(e as Error).message}`);
    }
  },

  /**
   * Adds a new truck document to an organization's 'trucks' sub-collection.
   * @param organizationId The ID of the organization to add the truck to.
   * @param truckData The data for the new truck.
   * @returns A promise that resolves when the truck has been successfully added.
   * @throws An error if the database write operation fails.
   */
  addTruck: async (organizationId: string, truckData: Truck): Promise<void> => {
    try {
      // Add truck to database under `organizations/${organizationId}/trucks/truckData.truckId`
      const truckDocRef = doc(db, `organizations/${organizationId}/trucks`, truckData.truckId);
      
      await setDoc(truckDocRef, truckData);

      console.log(`Truck "${truckData.truckId}" successfully added to organization "${organizationId}".`);
    } catch (e) {
      console.error("Error adding truck to database:", e);
      throw new Error(`Failed to add truck: ${(e as Error).message}`);
    }
  },

  /**
   * Updates an existing truck document by replacing it with new data.
   * @param organizationId The ID of the organization.
   * @param truckId The ID of the truck to update.
   * @param truckData The complete new data for the truck.
   * @returns A promise that resolves when the truck has been successfully updated.
   * @throws An error if the database write operation fails.
   */
  update: async (organizationId: string, truckId: string, truckData: Truck): Promise<void> => {
    try {
      const truckDocRef = doc(db, `organizations/${organizationId}/trucks`, truckId);

      // setDoc updates an existing document
      await setDoc(truckDocRef, truckData);

      console.log(`Truck "${truckId}" successfully updated in organization "${organizationId}".`);
    } catch (e) {
      console.error("Error updating truck in database:", e);
      throw new Error(`Failed to update truck: ${(e as Error).message}`);
    }
  },

  /**
   * Deletes a truck document from an organization's 'trucks' sub-collection.
   * @param organizationId The ID of the organization.
   * @param truckId The ID of the truck to delete.
   * @returns A promise that resolves when the truck has been successfully deleted.
   * @throws An error if the database delete operation fails.
   */
  remove: async (organizationId: string, truckId: string): Promise<void> => {
    try {
      const truckDocRef = doc(db, `organizations/${organizationId}/trucks`, truckId);

      await deleteDoc(truckDocRef);

      console.log(`Truck "${truckId}" successfully deleted from organization "${organizationId}".`);
    } catch (e) {
      console.error("Error deleting truck from database:", e);
      throw new Error(`Failed to delete truck: ${(e as Error).message}`);
    }
  },
};

export const chartDatabase = {
  /**
   * Adds a new calibration chart document to an organization's 'calibrationCharts' sub-collection.
   * @param organizationId The ID of the organization to add the chart to.
   * @param chartData The data for the new chart, including its chartId.
   * @returns A promise that resolves when the chart has been successfully added.
   * @throws An error if the database write operation fails.
   */
  add: async (organizationId: string, chartData: CalibrationChart): Promise<void> => {
    try {

      // Set new document under organizations/organizationId/calibrationCharts/chartData.chartId
      const chartDocRef = doc(db, `organizations/${organizationId}/calibrationCharts`, chartData.chartId);
      await setDoc(chartDocRef, chartData);
      console.log(`Chart "${chartData.chartId}" successfully added to organization "${organizationId}".`);
    } catch (e) {
      console.error("Error adding chart to database:", e);
      throw new FirestoreDatabaseError(
        `Failed to add chart: ${(e as Error).message}`, 
        500 // Internal Server Error
      );
    }
  },

  /**
   * Updates an existing calibration chart document.
   * @param organizationId The ID of the organization.
   * @param chartId The ID of the chart to update.
   * @param chartData The new data to replace the existing chart data.
   * @returns A promise that resolves when the chart is successfully updated.
   * @throws An error if the database update operation fails.
   */
  update: async (organizationId: string, chartId: string, chartData: Partial<CalibrationChart>): Promise<void> => {
    try {

      // update existing document
      const chartDocRef = doc(db, `organizations/${organizationId}/calibrationCharts`, chartId);
      await updateDoc(chartDocRef, chartData);
      console.log(`Chart "${chartId}" successfully updated in organization "${organizationId}".`);
    } catch (e) {
      console.error("Error updating chart in database:", e);
      throw new FirestoreDatabaseError(
      `Failed to update chart: ${(e as Error).message}`, 
      500 // Internal Server Error
    );
    }
  },

  /**
   * Deletes a calibration chart document from an organization's sub-collection.
   * @param organizationId The ID of the organization.
   * @param chartId The ID of the chart to delete.
   * @returns A promise that resolves when the chart has been successfully deleted.
   * @throws An error if the database delete operation fails.
   */
  remove: async (organizationId: string, chartId: string): Promise<void> => {
    try {
      const chartDocRef = doc(db, `organizations/${organizationId}/calibrationCharts`, chartId);
      await deleteDoc(chartDocRef);
      console.log(`Chart "${chartId}" successfully deleted from organization "${organizationId}".`);
    } catch (e) {
      console.error("Error deleting chart from database:", e);
      throw new FirestoreDatabaseError(
        `Failed to delete chart: ${(e as Error).message}`, 
        500 // Internal Server Error
      );
    }
  },

  /**
   * Checks if a calibration chart with the given chartId exists within an organization.
   * @param organizationId The ID of the organization.
   * @param chartId The ID of the chart to check.
   * @returns A Promise that resolves to true if the chart exists, false otherwise.
   * @throws An error if the database read operation fails.
   */
  exists: async (organizationId: string, chartId: string): Promise<boolean> => {
    try {
      const chartDocRef = doc(db, `organizations/${organizationId}/calibrationCharts`, chartId);
      const docSnap = await getDoc(chartDocRef);
      return docSnap.exists();
    } catch (e) {
      console.error(`Error checking if chart "${chartId}" exists:`, e);
      throw new FirestoreDatabaseError(
        `Failed to check for chart existence: ${(e as Error).message}`, 
        500 // Internal Server Error
      );
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
      // Get snapshot where employeeId is in the organization
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

export const permissionsDatabase = {
  /**
   * Fetches a specific role document from within an organization and checks if it
   * grants the requested permission for a given resource type.
   * @param organizationId The ID of the organization where the role is defined.
   * @param roleId The ID of the role to check (e.g., "driver", "admin").
   * @param resourcePath The path of the resource being requested (e.g., "organizations/employees/user123", "users/uid123")
   * @param accessType The permission being requested ("READ" or "WRITE").
   * @returns A promise that resolves to `true` if access is granted, `false` otherwise.
   * @throws An error if the role document cannot be found, which should be caught by the calling service.
   */
  getAccessStatus: async (organizationId: string, roleId: string, resourcePath: string, accessType: AccessType): Promise<boolean> => {
    try {

      const roleData = await organizationDatabase.getRole(organizationId, roleId);

      console.log("getAccessStatus CONSOLE LOG roleData(roleDocSnap.data()): ", roleData);

      if (!roleData?.permissions) {
        // The role exists but has no permissions defined, so deny access.
        // Should never happen but check edge case
        return false;
      }

      /**
       * resourceType is of the form 'organizations/ORG123/collectionName'
       * when checking access on a collection
       * OR
       * resourceType is of the form 'organizations/ORG123/collectionName/documentId'
       * when checking access on a certain document in a collection
       */
      const pathSegements = resourcePath.split("/");

      // Check if resourceType segments is odd and is of the form
      // 'organizations/ORG123/collectionName'
      if (pathSegements.length % 2 != 0) {
        const collectionName = pathSegements.at(-1) as string;
        const hasPermission = roleData.permissions[collectionName]?.[accessType];

        return hasPermission;
      }

      // pathSegments is even and
      // is of the form 'organizations/ORG123/collectionName/documentId'
      const collectionName = pathSegements.at(-2) as string;
      const documentId = pathSegements.at(-1) as string;

      // Check permissions map with specified collection and access type
      const hasPermission = roleData.permissions[collectionName]?.[accessType];

      // Check if trying to access to an employee document
      if (collectionName == "employees" && documentId) {
        //Check if trying to write to an employee documeny
        if (accessType == AccessType.WRITE) {
          /**
           * Only users with a higher permission level should be able to
           * write to users with a lower permission level
           */

          // Get role of employee trying to write to
          const requestedEmployeeRole = await organizationDatabase.getRole(organizationId, documentId);

          // Check if requesters permission level is greater than
          // permission level of employee trying to write to
          if (requestedEmployeeRole.level >= roleData.level) {
            return false;
          }        
        }
      }

      // return the permissions result
      return hasPermission == true;

    } catch (error) {
      console.error(`Error checking access status for role "${roleId}" on resource "${resourcePath}":`, error);
      // Re-throw the error to be handled by the calling business logic layer (e.g., firebaseVerify).
      throw error;
    }
  }
};