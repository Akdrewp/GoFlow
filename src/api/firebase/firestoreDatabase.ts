// import "server-only";

import { z } from "zod";

import { collection, doc, setDoc, getDoc, updateDoc, getDocs, query, where, DocumentData, orderBy } from "firebase/firestore";
import { db } from "./firebaseConfig";

import { 
  Assignment,
  assignmentSchema, 
  Employee,
  employeeSchema, 
  Organization,
  Role,
  roleSchema, 
  Truck,
  truckSchema, 
  UserProfile,
  CalibrationChart,
  calibrationChartSchema,
  Product,
  productSchema,
  Loadout,
  loadoutSchema,
  CalibrationReport,
  calibrationReportSchema
} from "@/api/database/database";
import { AccessType } from "./firebaseVerify";
import { CollectionReference, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

export class FirestoreDatabaseError extends Error {
  public readonly code: number;

  constructor(message: string, code: number) {
      super(message);
      this.name = "FirestoreDatabaseError";
      this.code = code;
  }
}

// Helper function for get
// Firestore stores dates as timestamps which get converted
// to the form {seconds: "123123", nanoseconds: "12312312"}
function convertTimestampsToDates(data: DocumentData | undefined): DocumentData | Date {
  // Terrible
  if (!data) return data as unknown as DocumentData;

  // If data is of the form {seconds: "123123", nanoseconds: "12312312"}
  // 
  if (data instanceof Timestamp || (typeof data == "object" && data && "seconds" in data)) {
    return new Date(data.seconds * 1000);
  }

  // Loop through array or object
  if (Array.isArray(data)) return data.map(convertTimestampsToDates);
  if (typeof data === 'object') {
    const newData: { [key: string]: DocumentData } = {};
    for (const key in data) {
      newData[key] = convertTimestampsToDates(data[key]);
    }
    return newData;
  }
  return data;
}

/**
 * Creates a generic repository for a Firestore sub-collection.
 * @param collectionName The name of the sub-collection (e.g., 'trucks', 'employees').
 * @returns A repository object with full CRUD and query capabilities.
 */
function createSubCollectionRepository<T>(
  collectionName: string,
  schema: z.ZodType<T> // Expects a Zod schema that validates to the type T
) {
  const getCollection = (organizationId: string): CollectionReference => {
    return adminDb.collection(`organizations/${organizationId}/${collectionName}`);
  };

  return {
    /**
     * Adds a new document to the sub-collection.
     * @param organizationId The ID of the parent organization.
     * @param docId The ID for the new document.
     * @param data The data for the new document.
     */
    add: async (organizationId: string, docId: string, data: T): Promise<T> => {
      await getCollection(organizationId).doc(docId).set(data as DocumentData);
      return data;
    },

    /**
     * Fetches a single document by its ID from the sub-collection.
     * @param organizationId The ID of the parent organization.
     * @param docId The ID of the document to fetch.
     * @returns The document data.
     * @throws {FirestoreDatabaseError} If the document is not found.
     */
    get: async (organizationId: string, docId: string): Promise<T> => {
      const docSnap = await getCollection(organizationId).doc(docId).get();
      if (!docSnap.exists) {
        throw new FirestoreDatabaseError(`Doc "${docId}" not found in "${collectionName}".`, 404);
      }
      
      const data = convertTimestampsToDates(docSnap.data());
      try {
        // The data is parsed with Zod for runtime safety, but the function's
        // return type is the clean TypeScript interface `T`.
        return schema.parse(data) as T;
      } catch (e) {
        throw new FirestoreDatabaseError(`Data integrity error in doc "${docId}": ${e}`, 500);
      }
    },

    /**
     * Partially updates an existing document in the sub-collection.
     * @param organizationId The ID of the parent organization.
     * @param docId The ID of the document to update.
     * @param data The partial data to update.
     * @throws {FirestoreDatabaseError} If the document is not found.
     */
    update: async (organizationId: string, docId: string, data: Partial<T>): Promise<void> => {

      console.log("getCollection(organizationId)",  await getCollection(organizationId).get());

      const docRef = getCollection(organizationId).doc(docId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        throw new FirestoreDatabaseError(
          `Cannot update document with ID "${docId}" because it was not found in collection "${collectionName}".`,
          404 // Not Found
        );
      }
      await docRef.update(data);
    },

    /**
     * Deletes a document from the sub-collection.
     * @param organizationId The ID of the parent organization.
     * @param docId The ID of the document to delete.
     * @throws {FirestoreDatabaseError} If the document is not found.
     */
    remove: async (organizationId: string, docId: string): Promise<void> => {
      const docRef = getCollection(organizationId).doc(docId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        throw new FirestoreDatabaseError(
          `Cannot delete document with ID "${docId}" because it was not found in collection "${collectionName}".`,
          404 // Not Found
        );
      }
      await docRef.delete();
    },

    /**
     * Checks if a document exists in the sub-collection.
     * @param organizationId The ID of the parent organization.
     * @param docId The ID of the document to check.
     * @returns True if the document exists, false otherwise.
     */
    exists: async (organizationId: string, docId: string): Promise<boolean> => {
      const docSnap = await getCollection(organizationId).doc(docId).get();
      return docSnap.exists;
    },
  };
}


export const productDatabase = createSubCollectionRepository<Product>('products', productSchema);
const loadoutDatabaseBase = createSubCollectionRepository<Loadout>('loadouts', loadoutSchema);
export const chartDatabase = createSubCollectionRepository<CalibrationChart>('calibrationCharts', calibrationChartSchema);
export const truckDatabase = createSubCollectionRepository<Truck>('trucks', truckSchema);
const roleDatabaseBase = createSubCollectionRepository<Role>('roles', roleSchema);
const employeeDatabaseBase = createSubCollectionRepository<Employee>('employees', employeeSchema);
const assignmentDatabaseBase = createSubCollectionRepository<Assignment>('assignments', assignmentSchema);
const calibrationReportDatabaseBase = createSubCollectionRepository<CalibrationReport>('calibrationReports', calibrationReportSchema);


export const calibrationReportDatabase = {
  ...calibrationReportDatabaseBase,

  /**
   * Adds a new calibration report document to an organization's sub-collection.
   * A unique reportId is generated automatically.
   * @param organizationId The ID of the organization.
   * @param initialReportData The data for the new report, excluding the reportId.
   * @returns A promise that resolves with the newly created CalibrationReport object.
   * @throws An error if the database write operation fails.
   */
  add: async (organizationId: string, initialReportData: Omit<CalibrationReport, "reportId">): Promise<CalibrationReport> => {
    try {
      // Create a reference to a new document in the sub-collection to generate a unique ID.
      const reportDocRef = doc(collection(db, `organizations/${organizationId}/calibrationReports`));
      
      // Combine the generated ID with the initial data to form the complete document.
      const fullReportData: CalibrationReport = {
        ...initialReportData,
        reportId: reportDocRef.id,
      };

      // Save the complete document to Firestore.
      await setDoc(reportDocRef, fullReportData);
      
      console.log(`Calibration report "${fullReportData.reportId}" added to organization "${organizationId}".`);
      
      // Return the full object, including the generated ID.
      return fullReportData;
    } catch (e) {
      console.error("Error adding calibration report to database:", e);
      throw e;
    }
  },

  /**
   * Fetches all calibration reports for a specific product within a specific assignment, ordered by oldest to newest.
   * @param organizationId The ID of the organization.
   * @param assignmentId The ID of the assignment to fetch reports for.
   * @param productId The ID of the product to filter reports by.
   * @returns A promise that resolves to an array of CalibrationReport objects for the specified product.
   * @throws An error if the database read operation fails.
   */
  getFromAssignment: async (organizationId: string, assignmentId: string, productId: string): Promise<CalibrationReport[]> => {
    try {
      const reportsRef = collection(db, `organizations/${organizationId}/calibrationReports`);
      
      // Query for reports matching the assignmentId AND the productId, ordered from newest to oldest.
      const q = query(
        reportsRef, 
        where("assignmentId", "==", assignmentId),
        where("productId", "==", productId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return [];
      }

      

      // Convert Timestamps to Dates
      return querySnapshot.docs.map(doc => {
          const data = convertTimestampsToDates(doc.data());
          try {
              return calibrationReportSchema.parse(data) as CalibrationReport;
          } catch (e) {
              console.error(`Zod validation failed for report in assignment ${assignmentId}:`, e);
              throw new FirestoreDatabaseError(`Data integrity error in assignment ${assignmentId}.`, 500);
          }
      });

    } catch (e) {
      console.error(`Error fetching reports for assignment "${assignmentId}" and product "${productId}":`, e);
      throw new Error(`Failed to fetch reports: ${(e as Error).message}`);
    }
  },

};

export const loadoutDatabase = {
  ...loadoutDatabaseBase,

  /**
   * Checks if a specific loadout is currently in use by any ACTIVE assignments.
   * This is the correct way to prevent deletion of a loadout that is part of an ongoing job.
   * @param organizationId The ID of the organization.
   * @param loadoutId The ID of the loadout to check for.
   * @returns A Promise that resolves to true if the loadout is in use, false otherwise.
   */
  isLoadoutInUse: async (organizationId: string, loadoutId: string): Promise<boolean> => {
    try {
      const assignmentsRef = adminDb.collection(`organizations/${organizationId}/assignments`);
      
      // Query for any assignment that uses this loadout AND is currently active.
      const q = assignmentsRef.where("loadoutId", "==", loadoutId).where("unassignedAt", "==", null);
      
      const querySnapshot = await q.get();
      
      // If the snapshot is not empty, it means at least one active assignment is using this loadout.
      return !querySnapshot.empty;
    } catch (e) {
      console.error(`Error checking if loadout "${loadoutId}" is in use:`, e);
      throw new Error(`Failed to check loadout usage: ${(e as Error).message}`);
    }
  },


};

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
      
      // Add user to database with data
      await setDoc(doc(db, "users", userProfile.uid), userProfile);

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


};

export const roleDatabase = {
  ...roleDatabaseBase,

  /**
   * Checks if a specific role is currently assigned to any employees in the organization.
   * @param organizationId The ID of the organization.
   * @param roleId The ID of the role to check for.
   * @returns A Promise that resolves to true if the role is in use, false otherwise.
   */
  isRoleInUse: async (organizationId: string, roleId: string): Promise<boolean> => {
    try {
      const employeesRef = adminDb.collection(`organizations/${organizationId}/employees`);
      const querySnapshot = await employeesRef.where("roleId", "==", roleId).get();
      // If the snapshot is not empty, it means at least one employee has this role.
      return !querySnapshot.empty;
    } catch (e) {
      console.error(`Error checking if role "${roleId}" is in use:`, e);
      throw new Error(`Failed to check role usage: ${(e as Error).message}`);
    }
  },
};

export const assignmentDatabase = {
  ...assignmentDatabaseBase,

  /**
   * OVERRIDE
   * Adds a new assignment document to an organization's 'assignments' sub-collection.
   * @param organizationId The ID of the organization.
   * @param initialAssignmentData The data for the new assignment, including its assignmentId.
   * @returns A promise that resolves when the assignment is successfully added.
   * @throws An error if the database write operation fails.
   */
  add: async (organizationId: string, initialAssignmentData: Omit<Assignment, "assignmentId">): Promise<Assignment> => {
    try {

      // Generate document and assignment id
      // Putting the specified collection without a documentId
      // creates an generated documentId which is assignmentId
      const assignmentDocRef = doc(collection(db, `organizations/${organizationId}/assignments`));

      console.log("assignmentDatabase CONSOLE LOG initialAssignment: ", initialAssignmentData);

      // Finish the Assignment document with the assignmentId
      const assignmentData = {
        ...initialAssignmentData,
        assignmentId: assignmentDocRef.id
      };

      // Add doc to database and return assignment
      await setDoc(assignmentDocRef, assignmentData);
      return assignmentData;
    } catch (e) {
      console.error("Error adding assignment to database:", e);
      throw new Error(`Failed to add assignment: ${(e as Error).message}`);
    }
  },

  /**
   * Checks if an assignment is currently active by verifying its 'unassignedAt' field is null.
   * @param organizationId The ID of the organization.
   * @param assignmentId The ID of the assignment to check.
   * @returns A Promise that resolves to true if the assignment is active, false otherwise.
   * @throws An error if the database read operation fails or the document doesn't exist.
   */
  isActive: async (organizationId: string, assignmentId: string): Promise<boolean> => {
    try {
      const assignmentDocRef = doc(db, `organizations/${organizationId}/assignments`, assignmentId);
      const docSnap = await getDoc(assignmentDocRef);

      if (!docSnap.exists()) {
        throw new FirestoreDatabaseError(
          "Assignment does not exist in the database",
          404 // Not Found is more appropriate here
        );
      }
      
      // Get the data from the document
      const assignmentData = docSnap.data();

      // An assignment is active if its 'unassignedAt' field is explicitly null.
      return assignmentData.unassignedAt === null;

    } catch (e) {
      console.error(`Error checking if assignment "${assignmentId}" is active:`, e);
      throw(e);
    }
  },

  /**
   * Checks if a specific truck has any active assignments.
   * This is used to prevent a truck from being assigned to multiple users simultaneously.
   * @param organizationId The ID of the organization.
   * @param truckId The ID of the truck to check.
   * @returns A Promise that resolves to true if the truck has an active assignment, false otherwise.
   */
  isTruckCurrentlyAssigned: async (organizationId: string, truckId: string): Promise<boolean> => {
    try {
      const assignmentsRef = collection(db, `organizations/${organizationId}/assignments`);
      
      // Query for assignments for this truck that are currently active (unassignedAt is null).
      const q = query(
        assignmentsRef, 
        where("truckId", "==", truckId), 
        where("unassignedAt", "==", null)
      );
      
      const querySnapshot = await getDocs(q);

      console.log("isTruckCurrentlyAssigned CONSOLE LOG querySnapshot: ", querySnapshot);
      
      // If the snapshot is not empty, it means there is at least one active assignment.
      return !querySnapshot.empty;

    } catch (e) {
      console.error(`Error checking if truck "${truckId}" is assigned:`, e);
      throw(e);
    }
  },

  /**
   * Fetches the currently active assignment for a specific user.
   * @param organizationId The ID of the organization.
   * @param userId The UID of the user to find the active assignment for.
   * @returns A Promise that resolves to the active Assignment object if one exists, otherwise null.
   * @throws An error if the database read operation fails.
   */
  getFromUser: async (organizationId: string, userId: string): Promise<Assignment | undefined> => {
    try {
      const assignmentsRef = collection(db, `organizations/${organizationId}/assignments`);
      
      // Query for an assignment for this user that is currently active (unassignedAt is null).
      const q = query(
        assignmentsRef, 
        where("userId", "==", userId), 
        where("unassignedAt", "==", null)
      );
      
      const querySnapshot = await getDocs(q);

      // An active user should only ever have one active assignment.
      if (querySnapshot.empty) {
        return undefined;
      }

      // Return the first (and should be only) result.
      return querySnapshot.docs[0].data() as Assignment;

    } catch (e) {
      console.error(`Error checking for active assignment for user "${userId}":`, e);
      throw(e);
    }
  },

};

export const employeeDatabase = {
  ...employeeDatabaseBase,

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
      throw(e);
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
      throw(e);
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

      const roleData = await roleDatabase.get(organizationId, roleId);

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
        //Check if trying to write to an employee document
        if (accessType == AccessType.WRITE) {
          /**
           * Only users with a higher permission level should be able to
           * write to users with a lower permission level
           */

          // Get role of employee trying to write to
          const requestedEmployee = await employeeDatabase.get(organizationId, documentId);
          const requestedEmployeeRole = await roleDatabase.get(organizationId, requestedEmployee.roleId);

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