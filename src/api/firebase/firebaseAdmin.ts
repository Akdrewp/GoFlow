// app/api/auth/signup/route.ts (or your Firebase Admin init file)

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {

  console.log("INITIALIZING FIREBASE ADMIN");

  // Check if the environment variable is set
  if (!process.env.FIREBASE_ADMIN_SDK_CONFIG) {
    throw new Error('FIREBASE_ADMIN_SDK_CONFIG environment variable is not set.');
  }

  // Parse the JSON string from the environment variable
  let serviceAccountConfig: JSON;
  try {
    serviceAccountConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);
  } catch (e) {
    console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", e);
    throw new Error('FIREBASE_ADMIN_SDK_CONFIG is not a valid JSON string. Please check its format.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountConfig as admin.ServiceAccount),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();