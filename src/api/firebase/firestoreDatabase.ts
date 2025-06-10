import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

import { Database, UserProfile, Organization } from "@/api/database/database";

interface user