// import "server-only";

import { z } from "zod";
import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs, query, where, } from "firebase/firestore";
import { db } from "@/api/firebase/firebaseConfig";

import { Database, UserProfile, userProfileSchema } from "@/api/database/database";



export async function POST(request: NextRequest) { // Use NextRequest for better typing
  let parsedReq; // Declare parsedReq outside try block for wider scope in catch

  try {
    parsedReq = await request.json(); // Renamed to parsedReq for clarity
    console.log("REQ CONSOLE LOG", parsedReq);

    const isValidUserFormData = userProfileSchema.safeParse(parsedReq); // Apply Zod to parsedReq

    console.log(isValidUserFormData);

    if (!isValidUserFormData.success) {
      return NextResponse.json({ status: "fail", message: isValidUserFormData.error }, { status: 400 });
    }

    // --- Duplicate Key Checks ---
    // All these checks use the validated data from parsedReq
    const { uid, name, email } = isValidUserFormData.data; // Destructure validated data

    // Check if user profile with UID already exists (Firestore document ID)
    const userDocRef = doc(db, 'users', uid); // Using validated 'uid'
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return NextResponse.json(
        { status: "fail", message: "User profile with this UID already exists." },
        { status: 409 } // Conflict
      );
    }

    // Check if user profile with user name already exists
    const usersRef = collection(db, 'users');
    const qName = query(usersRef, where('name', '==', name)); // Using validated 'name'
    const querySnapshotName = await getDocs(qName);
    if (!querySnapshotName.empty) { // Check if snapshot is NOT empty
      return NextResponse.json(
        { status: "fail", message: "User profile with this name already exists." },
        { status: 409 } // Conflict
      );
    }

    // Check if user profile with email already exists
    const qEmail = query(usersRef, where('email', '==', email)); // Using validated 'email'
    const querySnapshotEmail = await getDocs(qEmail);
    if (!querySnapshotEmail.empty) { // Check if snapshot is NOT empty
      return NextResponse.json(
        { status: "fail", message: "User profile with this email already exists." },
        { status: 409 } // Conflict
      );
    }

    

    // If all checks pass, you would proceed with creating the user or saving the profile
    // For now, just returning a success message as per your previous structure.
    return NextResponse.json(
      { status: "success", message: "All unique key checks passed!", data: isValidUserFormData.data },
      { status: 200 } // Or 201 Created if this is the final step
    );

  } catch (e) {
    console.error("API Route Error:", e);
    // If request.json() parsing fails (e.g., malformed JSON)
    if (e instanceof SyntaxError) {
        return NextResponse.json(
            { status: "error", message: "Invalid JSON in request body. Ensure Content-Type is application/json and body is valid JSON." },
            { status: 400 }
        );
    }
    // Catch other unexpected errors
    return NextResponse.json(
      { status: "error", message: "An unexpected internal server error occurred.", details: (e as Error).message },
      { status: 500 }
    );
  }
}