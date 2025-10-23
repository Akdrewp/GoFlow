import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration in case you want to clone
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

export const auth = getAuth(app);
