// src/app/api/auth/signup/route.ts

import "server-only";

import { NextRequest, NextResponse } from 'next/server';

import { db } from "@/api/firebase/firebaseConfig";
import { adminAuth } from "@/api/firebase/firebaseAdmin";
import { userProfileSchema } from "@/api/database/database";
import { FirebaseDatabaseError } from '@/api/firebase/firestoreDatabase';
import { userService } from "@/api/firebase/firebaseVerify";

import { collection, doc, getDoc, getDocs, query, where, } from "firebase/firestore";
import { FirebaseAuthError } from "firebase-admin/auth";


export async function signUpRoute(request: NextRequest) {
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

    //Check sent data agianst form schema
    parsedReq = await request.json();
    const isValidUserFormData = userProfileSchema.safeParse(parsedReq);

    if (!isValidUserFormData.success) {
      console.log("SERVER LOG: === Returning 400 - Zod Validation Failed ===");
      return NextResponse.json(
        { status: "fail", message: isValidUserFormData.error }, 
        { status: 400 }); //Bad Request User Error
    }

    // organizationId and employeeId may be undefined here if signing up individually
    const { uid, name, email, organizationId, employeeId } = isValidUserFormData.data;

    // --- Duplicate Key Checks ---

    // Check if user profile with UID already exists (Firestore document ID)
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
    const qEmail = query(usersRef, where('email', '==', email));
    const querySnapshotEmail = await getDocs(qEmail);
    if (!querySnapshotEmail.empty) {
      console.log("SERVER LOG: === Returning 409 - Email already exists in Firestore ===");
      return NextResponse.json(
        { status: "fail", message: "User profile with this email already exists." },
        { status: 409 } // Conflict
      );
    }

    //User uid and email matches firebase auth
    //Check if token is valid for specific user
    const decodedIdToken = await adminAuth.verifyIdToken(idToken);

    //Check if token matches email and uid
    if (decodedIdToken.uid != uid || decodedIdToken.email != email) {
      return NextResponse.json(
        { status: "fail", message: "Authenticated email/uid from token does not match provided email/uid." },
        { status: 403 } //Forbidden
      );
    }
    
    // Token matches provided data
    // Proceed with adding account to database

    // If signing up with organization
    if (organizationId && employeeId) {
      /**
       * @todo for now don't do anything special
       */
      await userService.add(parsedReq);

      console.log("SERVER LOG: === All unique key checks passed, returning 201 Success === Adding organization user to database");
      return NextResponse.json(
        { status: "success", message: "User account succesfully added to database", data: isValidUserFormData.data },
        { status: 201 } // 201 Created is appropriate for successful creation
      );

    } else { // Signing up individually
      // Add user to database
      await userService.add(parsedReq);

      console.log("SERVER LOG: === All unique key checks passed, returning 201 Success === Adding user to database");
      return NextResponse.json(
        { status: "success", message: "User account succesfully added to database", data: isValidUserFormData.data },
        { status: 201 } // 201 Created is appropriate for successful creation
      );
    }

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
    if (e && typeof e === 'object' && 'code' in e && 'message' in e && e.code && (e as FirebaseAuthError).code.startsWith('auth/')) {
        console.log(`SERVER LOG: === Returning 404 - User with passed UID NOT found in Firebase Auth ===`);
        return NextResponse.json(
            { status: "fail", message: "User not found in Firebase Authentication (UID mismatch). Please ensure account was created successfully." },
            { status: 404 } // Not Found
        );
    }

    if (e instanceof FirebaseDatabaseError ) {
      console.log("SERVER LOG: === Returning 400 - Database adding error ===");
      return NextResponse.json(
        { status: "fail", message: (e as Error).message },
        { status: e.code }
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