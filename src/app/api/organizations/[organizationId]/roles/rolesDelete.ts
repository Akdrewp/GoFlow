import { deleteRoleFromOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles deleting a role from an organization.
 * Path: DELETE /api/organizations/{organizationId}/roles/{roleId}
 */
export async function rolesDELETE(
  request: NextRequest,
  { organizationId, roleId }: { organizationId: string, roleId: string }
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

    // Call the business logic service to delete the role.
    await deleteRoleFromOrg(token, organizationId, roleId);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Role deleted successfully." },
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
    console.error("Error in DELETE role route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}