import admin from 'firebase-admin';

if (!admin.apps.length) {
  // Production: App Hosting/Cloud Run provide credentials automatically.
  if (process.env.NODE_ENV === 'production') {
    admin.initializeApp();
  } else {
    // Local Development: Use the service account from .env.local
    try {
      const serviceAccountConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG!);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountConfig as admin.ServiceAccount),
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG for local dev:", e);
    }
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();