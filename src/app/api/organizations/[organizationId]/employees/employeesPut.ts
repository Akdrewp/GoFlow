import "server-only";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { employeeSchema } from "@/api/database/database";
import { updateEmployeeInOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";

/**
 * Handles updating an employee's information.
 * This function handles partial updates to an employee.
 * Path: PUT /api/organizations/{organizationId}/employees/{employeeId}
 */
export async function employeesPUT(
  request: NextRequest,
  { organizationId , employeeId } : { organizationId: string, employeeId: string }
) {
  try {

    console.log("employees PUT employeeId", employeeId);

    // Create a partial schema for validation, as updates may only contain some fields.
    const updateEmployeeSchema = employeeSchema.partial();
    const requestBody = await request.json();
    const validationResult = updateEmployeeSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: validationResult.error.flatten() },
        { status: 400 } // Bad Request
      );
    }
    const employeeData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Update employee in organization
    await updateEmployeeInOrg(token, organizationId, employeeId, employeeData);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Employee updated successfully.", data: employeeData },
      { status: 200 } // OK
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: (e as Error).message },
        { status: e.code }
      );
    }

    // Generic error handler for any other unexpected errors.
    console.error("Error in update employee route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 } // Internal Server Error
    );
  }
}
