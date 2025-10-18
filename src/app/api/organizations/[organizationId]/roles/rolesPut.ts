import "server-only";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { roleSchema } from "@/api/database/database";
import { updateRoleInOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";

/**
 * Handles updating a role's information.
 * This function handles partial updates to a role.
 * Path: PUT /api/organizations/{organizationId}/roles/{roleId}
 */
export async function rolesPUT(
  request: NextRequest,
  { organizationId, roleId }: { organizationId: string, roleId: string }
) {
  try {

    // Create a partial schema for validation, as updates may only contain some fields.
    const updateRoleSchema = roleSchema.partial();
    const requestBody = await request.json();
    const validationResult = updateRoleSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: validationResult.error.flatten() },
        { status: 400 } // Bad Request
      );
    }
    const roleData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Update role in organization
    await updateRoleInOrg(token, organizationId, roleId, roleData);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Role updated successfully.", data: roleData },
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
    console.error("Error in update role route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}
