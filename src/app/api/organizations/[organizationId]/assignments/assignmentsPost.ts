import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { assignmentSchema } from "@/api/database/database";
import { addAssignmentToOrg, getUser } from "@/api/firebase/firebaseService";

/**
 * This route handles the creation of a assignment of a truck
 * Path: POST /api/organizations/{organizationId}/assignments
 */
export async function assignmentsPOST(
  request: NextRequest,
  { organizationId }: { organizationId: string }
) {
  try {

    // Validate the incoming request body against the assignment schema.
    const requestBody = await request.json();
    // Only need the truckId, userId since rest of data comes from token
    const assignmentTruckIdSchema = assignmentSchema.pick({ truckId: true, userId: true });
    const validationResult = assignmentTruckIdSchema.safeParse(requestBody);

    // Check if validation failed
    if (!validationResult.success) {
      console.log("validation failure: ", validationResult.error.message);
      return NextResponse.json(
        { status: "fail", message: validationResult.error.message },
        { status: 400 } // Bad Request
      );
    }
    const initialAssignmentData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Get user profile of employee being assigned
    const userProfile = await getUser(token, initialAssignmentData.userId);

    // Check whether user has employeeId and organizationId
    // Will be checked by assAssignmentToOrg via canUserAccessData
    // but typescript needs this check
    if (!userProfile.employeeId || !userProfile.organizationId) {
      throw new Error("User is not part of organization");
    }



    // Create assignmentData with userId and employeeId
    const assignmentData = {
      ...initialAssignmentData,
      employeeId: userProfile.employeeId
    };

    // add assignment to database
    const addedAssignment = await addAssignmentToOrg(token, organizationId, assignmentData);

    // Return a successful response.
    return NextResponse.json(
      { status: "success", message: "Assignment successfully.", data: addedAssignment},
      { status: 201 } // Created
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Genereic error handler
    console.error("Error in assignmentsPOST route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}