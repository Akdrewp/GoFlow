import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { loadoutSchema } from "@/api/database/database";
import { addLoadoutToOrg } from "@/api/firebase/firebaseService";
import { FirestoreDatabaseError } from '@/api/firebase/firestoreDatabase';
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";

/**
 * This route handles the creation of a new loadout for a specific organization.
 * Path: POST /api/organizations/{organizationId}/loadouts
 */
export async function loadoutPOST(
  request: NextRequest,
  { organizationId }: { organizationId: string }
) {
  try {

    // Validate the incoming request body against the loadout schema.
    const requestBody = await request.json();
    const validationResult = loadoutSchema.safeParse(requestBody);

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

    // Add loadout to organization
    await addLoadoutToOrg(token, organizationId, loadoutData);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Loadout successfully created.", data: loadoutData },
      { status: 201 } // Created
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Generic error handler for any other unexpected errors.
    console.error("Error in create loadout route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}
