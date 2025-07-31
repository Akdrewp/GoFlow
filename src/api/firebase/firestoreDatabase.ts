// import "server-only";

import { collection, doc, setDoc, getDoc, updateDoc, getDocs, query, where, } from "firebase/firestore";
import { db } from "./firebaseConfig";

import { Database, UserProfile, Organization} from "@/api/database/database";


// This object now implements the new, nested Database interface
export const firebaseDatabase: Database = {
    user: {
        /**
         * Adds or updates a user's profile information in the 'users' collection.
         */
        add: async (userProfile: UserProfile): Promise<void> => {
            try {
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
         * Fetches a user's profile from the 'users' collection by their UID.
         */
        get: async (uid: string): Promise<UserProfile | null> => {
            try {
                const userDocRef = doc(db, "users", uid);
                const docSnap = await getDoc(userDocRef);

                if (!docSnap.exists()) {
                    console.log(`No user found with UID: ${uid}`);
                    return null;
                }
                // It's a good practice to validate the data with Zod here before casting
                return docSnap.data() as UserProfile;
            } catch (e) {
                console.error(`Error getting user profile for UID ${uid}:`, e);
                throw new Error(`Failed to get user profile: ${(e as Error).message || 'Unknown error'}`);
            }
        },
    },

    organization: {
        /**
         * Adds a new organization's details, updates the creator's profile,
         * and adds them as the first employee.
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
                console.log("Organization document added with ID:", orgDocId);

                // Update the user who created the organization
                const createdByUserId = organization.createdBy;
                const createdByUserDoc = doc(db, "users", createdByUserId);
                await updateDoc(createdByUserDoc, {
                    organizationId: organization.organizationId,
                    employeeId: "1", // Assuming the creator is employee #1
                });

                // Get user details to add to the employees sub-collection
                const createdByUserProfile = await firebaseDatabase.user.get(createdByUserId);

                /**
                 * @todo Refactor this to check for this before everything
                 * if not only using within auth and form checking
                 */
                if (!createdByUserProfile) {
                    throw Error("Invalid createdByUserId");
                }

                const createdByUsername = createdByUserProfile.name;
                const createdByEmail = createdByUserProfile.email;

                if (!createdByEmail) {
                    throw new Error("User creating organization must have an email address.");
                } else if (!createdByUsername) {
                    throw new Error("User creating organization must have a username.");
                }

                // Create the employee document within the organization's sub-collection
                const organizationEmployeesDoc = doc(db, `organizations/${orgDocId}/employees`, createdByUserId);
                await setDoc(organizationEmployeesDoc, {
                    name: createdByUsername,
                    email: createdByEmail,
                    role: "admin",
                    status: "active",
                    employeeId: "1",
                    uid: createdByUserId,
                });

            } catch (e) {
                console.error("Error adding organization to database:", e);
                throw new Error(`Failed to add organization to database: ${(e as Error).message || 'Unknown error'}`);
            }
        },

        /**
         * Checks if an organization with the given custom ID exists.
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
    },

    employee: {
        /**
         * Checks if an employeeId is valid for a given organization.
         */
        existsInOrg: async (organizationId: string, employeeId: string): Promise<boolean> => {
            try {
                // This assumes employee records are stored in a sub-collection
                const employeesRef = collection(db, `organizations/${organizationId}/employees`);
                const q = query(employeesRef, where("employeeId", "==", employeeId));
                const querySnapshot = await getDocs(q);
                return !querySnapshot.empty;
            } catch (e) {
                console.error("Error checking employee ID validity within organization:", e);
                throw new Error(`Failed to check employee ID validity: ${(e as Error).message || 'Unknown error'}`);
            }
        },

        /**
         * Checks if an employeeId is already associated with an existing user profile.
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
    }
};
