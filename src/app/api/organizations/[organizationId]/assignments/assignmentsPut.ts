import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { assignmentSchema } from "@/api/database/database";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";

/**
 * This route handles the updating of an existing chart
 * Path: PUT /api/organizations/{organizationId}/assignments/{assignmentId}
 */
export async function assignmentsPUT(
  request: NextRequest,
  { organizationId, assignmentId }: { organizationId: string, assignmentId: string }
) {
  try {

    // Validate the incoming request body against the truck schema.
    const requestBody = await request.json();
    const validationResult = assignmentSchema.safeParse(requestBody);

    // Check if validation failed
    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: validationResult.error.message },
        { status: 400 } // Bad Request
      );
    }
    const assignmentData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // update assignmentData to database
    await updateAssignmentInOrg(token, organizationId, assignmentData);

    // Return a successful response.
    return NextResponse.json(
      { status: "success", message: "Truck successfully created.", data: assignmentData },
      { status: 200 } // Created
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Genereic error handler
    console.error("Error in create truck route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}