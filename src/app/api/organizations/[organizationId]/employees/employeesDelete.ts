import { deleteEmployeeFromOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles deleting an employee from an organization.
 * Path: DELETE /api/organizations/{organizationId}/employees/{employeeId}
 */
export async function employeesDELETE(
  request: NextRequest,
  { organizationId , employeeId } : { organizationId: string, employeeId: string }
) {
  try {

    //Get session token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." }, 
        { status: 401 } // Unauthorized
      );
    }

    // Call the business logic service to delete the employee.
    await deleteEmployeeFromOrg(token, organizationId, employeeId);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Employee deleted successfully." },
      { status: 200 } // OK
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: (e as Error).message }, 
        { status: e.code }
      );
    }
    // Handle any other unexpected errors
    console.error("Error in DELETE employee route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 }
    );
  }
}