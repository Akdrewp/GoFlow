// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_l-MV0m9E-PSira0Tc5v8QYw2J6dG1hk",
  authDomain: "goflow-routemaker.firebaseapp.com",
  projectId: "goflow-routemaker",
  storageBucket: "goflow-routemaker.firebasestorage.app",
  messagingSenderId: "865877999500",
  appId: "1:865877999500:web:db9c4554c9e5191f5ee0a9",
  measurementId: "G-NFW2V70NB6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);
export const auth = getAuth();

connectAuthEmulator(auth, "http://127.0.0.1:9099");
connectFirestoreEmulator(db, '127.0.0.1', 8080);
// const analytics = getAnalytics(app);