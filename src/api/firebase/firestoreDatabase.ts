// import "server-only";

import { collection, doc, setDoc, getDoc, updateDoc, getDocs, query, where, } from "firebase/firestore";
import { db } from "./firebaseConfig";

import { Database, UserProfile, Organization, Employee } from "@/api/database/database";

export class firebaseDatabaseError extends Error {}

// This object now implements the new, nested Database interface
export const firebaseDatabase: Database = {
    user: {
        /**
         * Adds or updates a user's profile information in the 'users' collection.
         * throws Error if userProfile includes orgnaizationId and employeeId
         * but orgnization does not exists, employee does not exists, or
         * employee already has an associated account
         */
        add: async (userProfile: UserProfile): Promise<void> => {
            try {
                // If signing up with organization
                if(userProfile.employeeId && userProfile.organizationId) {

                    // If organization does not exist
                    if ( !(await firebaseDatabase.organization.exists(userProfile.organizationId)) ) {
                        throw new firebaseDatabaseError("Organization with passed organizationId does not exist");
                    }

                    // Check if employee exists and is not associated with any user yet
                    const employeeExistsInOrg = await firebaseDatabase.employee.existsInOrg(userProfile.organizationId, userProfile.employeeId);
                    const isEmployeeAlreadyAssociated = await firebaseDatabase.employee.isAssociated(userProfile.employeeId);
                    if (employeeExistsInOrg){
                        if (isEmployeeAlreadyAssociated) {
                            throw new firebaseDatabaseError("Employee with passed employeeId already associated with an account");
                        }

                        // User is in organization and is not associated with an organization yet
                        // Activate user with user information
                        await firebaseDatabase.employee.activate(userProfile.organizationId, userProfile.employeeId, userProfile.uid);
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
         */
        get: async (uid: string): Promise<UserProfile | null> => {
            try {
                /**
                 * @todo use of getDoc in these methods probably should delegate to firebaseVerify
                 */
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
                /**
                 * @todo Decide what to do about employeeId of person who created organization
                 */
                const creatorEmployeeId = "1"; 
                const createdByUserId = organization.createdBy;
                const createdByUserDoc = doc(db, "users", createdByUserId);
                await updateDoc(createdByUserDoc, {
                    organizationId: organization.organizationId,
                    employeeId: creatorEmployeeId, // Assuming the creator is employee #1
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

                // Organization is created in database
                // Add creator as employee
                await firebaseDatabase.organization.addEmployee(organization.organizationId,
                    {name: createdByUsername,
                    email: createdByEmail,
                    role: "admin",
                    status: "active",
                    employeeId: creatorEmployeeId,
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

                querySnapshot.docs.forEach((doc) => {
                    console.log("firebaseDatabase.employee.existsInOrg CONSOLE LOG Doc data: ", doc.data());
                });

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
    }
};
