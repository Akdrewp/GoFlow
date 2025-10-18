import { deleteLoadoutFromOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles deleting a loadout from an organization.
 * Path: DELETE /api/organizations/{organizationId}/loadouts/{loadoutId}
 */
export async function loadoutDELETE(
  request: NextRequest,
  { organizationId , loadoutId } : { organizationId: string, loadoutId: string }
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

    // Call the business logic service to delete the loadout.
    await deleteLoadoutFromOrg(token, organizationId, loadoutId);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Loadout deleted successfully." },
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
    console.error("Error in DELETE loadout route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 }
    );
  }
}