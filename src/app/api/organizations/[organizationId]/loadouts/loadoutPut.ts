import "server-only";

import { loadoutSchema } from "@/api/database/database";
import { updateLoadoutInOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles updating a loadout's information.
 * This function handles partial updates to a loadout.
 * Path: PUT /api/organizations/{organizationId}/loadouts/{loadoutId}
 */
export async function loadoutPUT(
  request: NextRequest,
  { organizationId , loadoutId } : { organizationId: string, loadoutId: string }
) {
  try {

    // Create a partial schema for validation, as updates may only contain some fields.
    const updateLoadoutSchema = loadoutSchema.partial();
    const requestBody = await request.json();
    const validationResult = updateLoadoutSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: validationResult.error.flatten() },
        { status: 400 } // Bad Request
      );
    }
    const loadoutData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Update loadout in organization
    await updateLoadoutInOrg(token, organizationId, loadoutId, loadoutData);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Loadout updated successfully.", data: loadoutData },
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
    console.error("Error in update loadout route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 } // Internal Server Error
    );
  }
}

