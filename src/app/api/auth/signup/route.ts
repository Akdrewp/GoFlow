// src/app/api/auth/signup/route.ts

// import "server-only"; // Keep this commented or uncommented as per your preference

import { NextRequest, NextResponse } from 'next/server';

// KEEPING THESE IMPORTS AS REQUESTED (CLIENT-SIDE FIRESTORE SDK)
import { collection, doc, getDoc, getDocs, query, where, } from "firebase/firestore";
import { db } from "@/api/firebase/firebaseConfig"; // This 'db' is from your client-side config

import { adminAuth } from "@/api/firebase/firebaseAdmin"; // This is the Admin SDK Auth instance

// Assuming these are correctly defined and imported
import { userProfileSchema } from "@/api/database/database";
import { firebaseDatabase } from '@/api/firebase/firestoreDatabase';


export async function POST(request: NextRequest) {
  let parsedReq;

  try {
    parsedReq = await request.json();
    console.log("SERVER LOG: === Incoming Request Body (parsedReq) ===", parsedReq);

    const isValidUserFormData = userProfileSchema.safeParse(parsedReq);

    if (!isValidUserFormData.success) {
      console.log("SERVER LOG: === Returning 400 - Zod Validation Failed ===");
      return NextResponse.json({ status: "fail", message: isValidUserFormData.error }, { status: 400 });
    }

    const { uid, name, email } = isValidUserFormData.data; // Destructure validated data

    // --- Duplicate Key Checks ---

    // Check if user profile with UID already exists (Firestore document ID)
    // NOTE: Using 'db' from client-side config as requested.
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      console.log("SERVER LOG: === Returning 409 - UID already exists in Firestore ===");
      return NextResponse.json(
        { status: "fail", message: "User profile with this UID already exists." },
        { status: 409 } // Conflict
      );
    }

    // Check if user profile with user name already exists
    // NOTE: Using 'db' from client-side config as requested.
    const usersRef = collection(db, 'users');
    const qName = query(usersRef, where('name', '==', name));
    const querySnapshotName = await getDocs(qName);
    if (!querySnapshotName.empty) {
      console.log("SERVER LOG: === Returning 409 - Name already exists in Firestore ===");
      return NextResponse.json(
        { status: "fail", message: "User profile with this name already exists." },
        { status: 409 } // Conflict
      );
    }

    // Check if user profile with email already exists
    // NOTE: Using 'db' from client-side config as requested.
    const qEmail = query(usersRef, where('email', '==', email));
    const querySnapshotEmail = await getDocs(qEmail);
    if (!querySnapshotEmail.empty) {
      console.log("SERVER LOG: === Returning 409 - Email already exists in Firestore ===");
      return NextResponse.json(
        { status: "fail", message: "User profile with this email already exists." },
        { status: 409 } // Conflict
      );
    }

    // --- NEW LOGIC: Check if user IS in Firebase Auth before adding to Firestore ---
    // We now expect 'getUsers' to find a user. If it doesn't, that's the error.
    const firebaseAuthUserResult = await adminAuth.getUsers([
      { uid: uid },
      { email: email },
    ]);

    // If NO users were found for the given UID or email, then the Firebase Auth user does not exist.
    // This indicates a problem (e.g., client-side signup failed or client sent incorrect info).
    if (firebaseAuthUserResult.users.length === 0) {
      console.log("SERVER LOG: === Returning 404 - User NOT found in Firebase Auth ===");
      return NextResponse.json(
        { status: "fail", message: "User not found in Firebase Authentication. Please ensure account was created successfully." },
        { status: 404 } // Not Found, or 400 Bad Request
      );
    }

    // If all checks pass, you would proceed with creating the user or saving the profile
    firebaseDatabase.addUserToDatabase(parsedReq);
    console.log("SERVER LOG: === All unique key checks passed, returning 201 Success === Adding user to database");
    return NextResponse.json(
      { status: "success", message: "User account succesfully added to database", data: isValidUserFormData.data },
      { status: 201 } // 201 Created is appropriate for successful creation
    );

  } catch (e) { 
    console.error("SERVER LOG: === API Route Error caught in catch block ===", e);
    // If request.json() parsing fails (e.g., malformed JSON)
    if (e instanceof SyntaxError) {
      console.log("SERVER LOG: === Returning 400 - JSON Parsing Error ===");
      return NextResponse.json(
        { status: "error", message: "Invalid JSON in request body. Ensure Content-Type is application/json and body is valid JSON." },
        { status: 400 }
      );
    }
    // Catch other unexpected errors
    console.log("SERVER LOG: === Returning 500 - Unexpected Server Error ===");
    return NextResponse.json(
      { status: "error", message: "An unexpected internal server error occurred.", details: (e as Error).message || 'No specific error message.' },
      { status: 500 }
    );
  }
}