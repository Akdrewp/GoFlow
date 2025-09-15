import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";

import { FirebaseVerifyError, isValidUserToken, organizationService } from "@/api/firebase/firebaseVerify";
import { organizationSchema } from "@/api/database/database";
import { FirebaseAuthError } from "firebase-admin/auth";

//For creating an organization
export async function organizationsRoute(request: NextRequest) {

  try {
    // Check sent data agianst organization schema
    // Only check for name, email, and organizationId since
    // Those are the form data
    const formOrganizationSchema = organizationSchema.pick({name : true, email: true, organizationId: true});
    const parsedReq = await request.json();
    const isValidUserFormData = formOrganizationSchema.safeParse(parsedReq);

    if (!isValidUserFormData.success) {
      console.log("SERVER LOG: === Returning 400 - Zod Validation Failed ===");
      return NextResponse.json(
        { status: "fail", message: isValidUserFormData.error }, 
        { status: 400 }); //Bad Request User Error
    }

    const { name, email, organizationId } = isValidUserFormData.data; // Destructure validated data

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

    const userDecodedIdToken = await isValidUserToken(token);

    // This checks for any duplicate organizations
    await organizationService.create(token, {
      name: name,
      email: email,
      organizationId: organizationId,
      createdAt: new Date(),
      createdBy: userDecodedIdToken.uid,
    });

    //Organization added successfully
    return NextResponse.json(
      { status: "success", message: "Organization added to database", data: isValidUserFormData.data },
      { status: 201 } //Created
    );
  } catch(e) {

    if (e instanceof FirebaseAuthError) {
      return NextResponse.json(
        { status: "error", message: `Firebase Auth error: ${e.message}`},
        { status: 400 } //Bad Request User Error
      );
    }

    if (e instanceof FirebaseVerifyError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    return NextResponse.json(
      { status: "error", message: `Unknown error ${(e as Error).message}`},
      { status: 500 } //Internal server error
    );
  }

}