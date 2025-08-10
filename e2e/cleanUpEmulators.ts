import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";

export const clearFirestoreAuth = async () => {
    //Deletes 1000 top users
    const topUsers = await adminAuth.listUsers();
    topUsers.users.forEach( (user) => {
        void (async () => {
            await adminAuth.deleteUser(user.uid);
        })();
    });
};

export const clearFirestoreDB = async () => {
    // Get a reference to the 'users' collection
    const usersCollectionRef = adminDb.collection('users');

    // Get a reference to the 'organizations' collection
    const organizationsCollectionRef = adminDb.collection('organizations');

    // Use recursiveDelete on the collection reference
    // This will delete all documents and subcollections within 'users'.
    await adminDb.recursiveDelete(usersCollectionRef);
    await adminDb.recursiveDelete(organizationsCollectionRef);
    console.log("Firestore 'users' collection and its subcollections (if any) recursively deleted.");
};