// import "server-only";

import { collection, doc, setDoc, getDoc, getDocs, query, where, } from "firebase/firestore";
import { db } from "./firebaseConfig";

import { Database, UserProfile, Organization} from "@/api/database/database";


// Export an object that adheres to the IDatabaseService interface
export const firebaseDatabase: Database = {
    /**
     * Adds or updates a user's profile information in the 'users' collection.
     * The Firebase Auth UID is used as the document ID.
     * Optional fields (organizationId, employeeId) are only added if present.
     * 
     * This doesn't protect against any bad actors other than through firestore rules,
     * prior backend validation required before calling.
     *
     * @param userProfile - The user's profile data, including UID.
     * @returns A Promise that resolves when the operation is complete.
     * @throws {Error} If the database operation fails.
     */
    addUserToDatabase: async (userProfile: UserProfile): Promise<void> => {
        try {
            //Add user with specified fields
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
            throw new Error(`Failed to add user to database: ${(e as Error).message || 'Unknown error'}`);
        }
    },

    /**
     * Adds a new organization's details to the 'organizations' collection.
     * The organization's Firebase Auth UID (`organization.uid`) is used as the document ID.
     * The custom `organizationId` field is stored within the document.
     *
     * @param organization - The organization's data.
     * @returns A Promise that resolves when the operation is complete.
     * @throws {Error} If the database operation fails.
     */
    addOrganizationToDatabase: async (organization: Organization): Promise<void> => {
        try {
            // The document ID for an organization is its Firebase Auth UID (organization.uid)
            const orgDocId = organization.uid;

            await setDoc(doc(db, "organizations", orgDocId), {
                name: organization.name,
                email: organization.email,
                uid: organization.uid, // This is the Firebase Auth UID (and doc ID)
                organizationId: organization.organizationId, // This is the *custom* organization ID field
                createdBy: organization.createdBy,
                createdAt: organization.createdAt,
            });
            console.log("Organization document added with ID:", orgDocId);
        } catch (e) {
            console.error("Error adding organization to database:", e);
            throw new Error(`Failed to add organization to database: ${(e as Error).message || 'Unknown error'}`);
        }
    },

    /**
     * Checks if an organization with the given custom organizationId exists.
     * It queries the 'organizations' collection where the 'organizationId' field matches.
     *
     * @param customOrganizationId The custom business ID of the organization to check.
     * @returns A Promise resolving to true if the organization exists, false otherwise.
     */
    organizationExists: async (customOrganizationId: string): Promise<boolean> => {
        try {
            const organizationsRef = collection(db, "organizations");
            const q = query(organizationsRef, where("organizationId", "==", customOrganizationId));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty; // If any document matches the custom organizationId, it exists
        } catch (e) {
            console.error("Error checking organization existence:", e);
            throw new Error(`Failed to check organization existence: ${(e as Error).message || 'Unknown error'}`);
        }
    },

    /**
     * Checks if an employeeId is valid for a given organization (identified by its custom organizationId)
     * and not yet "consumed".
     * This logic is highly dependent on your data model for employee IDs within organizations.
     *
     * @param customOrganizationId The custom business ID of the organization.
     * @param employeeId The employee ID to validate.
     * @returns A Promise resolving to true if the employeeId is valid for the organization, false otherwise.
     */
    employeeIdExistsInOrganization: async (customOrganizationId: string, employeeId: string): Promise<boolean> => {
        try {
            // First, find the organization document by its customOrganizationId
            const organizationsRef = collection(db, "organizations");
            const orgQuery = query(organizationsRef, where("organizationId", "==", customOrganizationId));
            const orgSnapshot = await getDocs(orgQuery);

            if (orgSnapshot.empty) {
                return false; // Organization itself not found
            }

            // Assuming there's only one organization per customOrganizationId, get the first one
            const organizationDoc = orgSnapshot.docs[0];
            const orgDocId = organizationDoc.id; // This is the Firebase Auth UID of the organization's admin

            // Now, check for the employeeId within this specific organization's document or subcollection
            // Example: Assumes 'organizations/{orgAuthUserUid}/employee_slots/{employeeId}'
            const employeeSlotRef = doc(db, "organizations", orgDocId, "employee_slots", employeeId);
            const docSnap = await getDoc(employeeSlotRef);

            return docSnap.exists(); // Simple existence check for the employee slot
        } catch (e) {
            console.error("Error checking employee ID validity within organization:", e);
            throw new Error(`Failed to check employee ID validity: ${(e as Error).message || 'Unknown error'}`);
        }
    },

    /**
     * Checks if an employeeId is already associated with an existing user profile.
     * Assumes UserProfile documents have an 'employeeId' field.
     * @param employeeId The employee ID to check.
     * @returns A Promise resolving to true if a user with this employeeId already exists, false otherwise.
     */
    isEmployeeIdAlreadyAssociatedWithUser: async (employeeId: string): Promise<boolean> => {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("employeeId", "==", employeeId));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty; // If querySnapshot is not empty, it means a user exists with that employeeId
        } catch (e) {
            console.error("Error checking if employee ID is already associated with a user:", e);
            throw new Error(`Failed to check employee ID association: ${(e as Error).message || 'Unknown error'}`);
        }
    },
};