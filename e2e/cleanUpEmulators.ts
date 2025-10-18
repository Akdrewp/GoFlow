import { adminAuth, adminDb } from "@/api/firebase/firebaseAdmin";

// Problem is the e2e tests would stall when the recursive delete would delete
// too many documents too quickly
const slowWriter = adminDb.bulkWriter({
  throttling: {
    // Start and with a maximum of 10 operations per seconds
    initialOpsPerSecond: 30,
    maxOpsPerSecond: 30
  }
});

export const clearFirestoreAuth = async () => {
  //Deletes 1000 top users
  const topUsers = await adminAuth.listUsers();
  topUsers.users.forEach( (user) => {
    void (async () => {
      await adminAuth.deleteUser(user.uid);
    })();
  });

  console.log("Firestore auth users deleted.");
};

export const clearFirestoreDB = async () => {
  // Get a reference to the 'users' collection
  const usersCollectionRef = adminDb.collection('users');

  // Get a reference to the 'organizations' collection
  const organizationsCollectionRef = adminDb.collection('organizations');

  // Use recursiveDelete on the collection reference
  // This will delete all documents and subcollections within 'users'.
  await adminDb.recursiveDelete(usersCollectionRef, slowWriter);
  await adminDb.recursiveDelete(organizationsCollectionRef, slowWriter);
  console.log("Firestore 'users' collection and its subcollections (if any) recursively deleted.");
};

export const clearFireStore = async () => {
  try {
    await clearFirestoreAuth();
    await clearFirestoreDB();
  } catch (e) {
    console.error("Error during afterAll cleanup:", e);
  }
};