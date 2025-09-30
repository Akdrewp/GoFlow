import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { deleteAssignmentFromOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";

/**
 * This route handles the deletion of an assignment
 * Path: PUT /api/organizations/{organizationId}/assignments/{assignmentId}
 */
export async function assignmentsDELETE(
  request: NextRequest,
  { organizationId, assignmentId }: { organizationId: string, assignmentId: string }
) {
  try {

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Delete assignment from database
    await deleteAssignmentFromOrg(token, organizationId, assignmentId);

    // Return a successful response.
    return NextResponse.json(
      { status: "success", message: "Assignment successfully deleted" },
      { status: 200 } // Success
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Genereic error handler
    console.error("Error in assignmentDELETE route", e);
    return NextResponse.json(
      { status: "error", message: `An internal server error occurred. ${e}` },
      { status: 500 } // Internal Server Error
    );
  }
}