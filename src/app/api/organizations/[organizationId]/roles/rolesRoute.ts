import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";

import { roleSchema } from "@/api/database/database";
import { FirebaseVerifyError, isValidUserToken } from "@/api/firebase/firebaseVerify";
import { addRoleToOrg, getUser } from "@/api/firebase/firebaseService";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";

//For adding a role to an organization
export async function rolesRoute(request: NextRequest) {
  try {
    // Check if received data matches roles schema
    const parsedReq = await request.json();
    const isValidUserFormData = roleSchema.safeParse(parsedReq);
    if (!isValidUserFormData.success) {
      console.log("SERVER LOG: === Returning 400 - Zod Validation Failed ===");
      return NextResponse.json(
        { status: "fail", message: isValidUserFormData.error.message }, 
        { status: 400 } //Bad Request User Error
      );
    }

    //Destructure form data
    const formRoleData = isValidUserFormData.data;

    //Get session token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;

    //Check if there is a token
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } //Unauthorized
      );
    }

    const decodedIdToken = await isValidUserToken(token);
    const userProfile = await getUser(token,  decodedIdToken.uid);

    if (!userProfile.employeeId || !userProfile.organizationId) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 403 } // Forbidden
      );
    }

    await addRoleToOrg(token, userProfile.organizationId, formRoleData);

    // Role added
    return NextResponse.json(
      { status: "success", message: "Role added to organization", data: formRoleData }, 
      { status: 200 }  //Success
    );
  } catch(e) {
  
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Catch any unexpected errors from the service layer or elsewhere
    console.error("Error in add employee route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}