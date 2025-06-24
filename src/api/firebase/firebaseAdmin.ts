import * as admin from 'firebase-admin';

// Path to your service account key file (relative or absolute)
// IMPORTANT: Make sure this path is correct for where your server-side code runs!
import serviceAccount from '/home/james_paul/GoFlow-app/goflow-routemaker-firebase-adminsdk-fbsvc-683cfa7e78.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  // You can also specify other options here if needed,
  // like databaseURL or storageBucket if they're not the defaults.
  // databaseURL: "https://YOUR_DATABASE_ID.firebaseio.com",
  // storageBucket: "YOUR_STORAGE_BUCKET.appspot.com"
});

// ... rest of your admin code ...

