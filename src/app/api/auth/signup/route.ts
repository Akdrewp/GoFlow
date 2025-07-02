// src/app/api/auth/signup/route.ts

import "server-only";

import { NextRequest, NextResponse } from 'next/server';

// KEEPING THESE IMPORTS AS REQUESTED (CLIENT-SIDE FIRESTORE SDK)
import { collection, doc, getDoc, getDocs, query, where, } from "firebase/firestore";
import { AuthError } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";

import { db } from "@/api/firebase/firebaseConfig"; // This 'db' is from your client-side config

import { adminAuth } from "@/api/firebase/firebaseAdmin"; // This is the Admin SDK Auth instance

// Assuming these are correctly defined and imported
import { userProfileSchema } from "@/api/database/database";
import { firebaseDatabase } from '@/api/firebase/firestoreDatabase';
import { z } from 'zod';


export async function POST(request: NextRequest) {
  let parsedReq;

  try {

    // Check if auth token exists
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: "fail", message: "Authorization token required." },
        { status: 401 } // Unauthorized
      );
    }

    // Extract the token part
    const idToken = authHeader.split('Bearer ')[1];

    parsedReq = await request.json();

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

    const authUser = await adminAuth.getUser(uid); // Attempt to get the user directly by UID

    // If the user is found by UID, now verify if their email matches the provided email.
    if (authUser.email !== email) {
        console.log(`SERVER LOG: === Returning 404 - User found by UID (${uid}) but email (${authUser.email}) does NOT match provided email (${email}) ===`);
        return NextResponse.json(
            { status: "fail", message: "User found by UID but the associated email does not match. Please ensure correct user information." },
            { status: 404 } // Conflict
        );
    }

    //User uid and email matches firebase auth
    //Check if token is valid for specific user
    

    // If all checks pass, you would proceed with creating the user or saving the profile
    await firebaseDatabase.addUserToDatabase(parsedReq);
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

    //If it's a firebase Error
    if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
        console.log(`SERVER LOG: === Returning 404 - User with passed UID NOT found in Firebase Auth ===`);
        return NextResponse.json(
            { status: "fail", message: "User not found in Firebase Authentication (UID mismatch). Please ensure account was created successfully." },
            { status: 404 } // Not Found
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