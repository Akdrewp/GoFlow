import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

import { Database, UserProfile, Organization } from "@/api/database/database";

// Export an object that adheres to the IDatabaseService interface
export const firebaseDatabase: Database = {
    /**
     * Adds or updates a user's profile information in the 'users' collection.
     * The Firebase Auth UID is used as the document ID.
     * Optional fields (organizationId, employeeId) are only added if present.
     *
     * @param userProfile - The user's profile data, including UID.
     * @returns A Promise that resolves when the operation is complete.
     * @throws {Error} If the database operation fails.
     */
    addUserToDatabase: async (userProfile: UserProfile): Promise<void> => {
        try {
            await setDoc(doc(db, "users", userProfile.uid), {
                name: userProfile.name,
                email: userProfile.email,
                uid: userProfile.uid,
                ...(userProfile.organizationId && { organizationId: userProfile.organizationId }),
                ...(userProfile.employeeId && { employeeId: userProfile.employeeId }),
                createdAt: new Date(),
            });
            console.log("User document added/updated with UID:", userProfile.uid);
        } catch (e) {
            console.error("Error adding user to database:", e);
            throw new Error(`Failed to add user to database: ${(e as Error).message || 'Unknown error'}`);
        }
    },

    /**
     * Adds a new organization's details to the 'organizations' collection.
     * The organization's UID or organizationId is used as the document ID.
     *
     * @param organization - The organization's data.
     * @returns A Promise that resolves when the operation is complete.
     * @throws {Error} If the database operation fails.
     */
    addOrganizationToDatabase: async (organization: Organization): Promise<void> => {
        try {
            const orgDocId = organization.uid || organization.organizationId || doc(collection(db, "organizations")).id;

            await setDoc(doc(db, "organizations", orgDocId), {
                name: organization.name,
                email: organization.email,
                uid: organization.uid,
                organizationId: organization.organizationId,
                createdBy: organization.createdBy,
                createdAt: new Date(),
            });
            console.log("Organization document added with ID:", orgDocId);
        } catch (e) {
            console.error("Error adding user to database:", e);
            throw new Error(`Failed to add user to database: ${(e as Error).message || 'Unknown error'}`);
        }
    },
};