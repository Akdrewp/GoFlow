import "server-only";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { calibrationReportSchema } from "@/api/database/database";
import { updateCalibrationReportInOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";

/**
 * Handles updating a calibration report's information.
 * This function handles partial updates to a calibration report.
 * Path: PUT /api/organizations/{organizationId}/calibrationReports/{reportId}
 */
export async function calibrationReportPUT(
  request: NextRequest,
  { organizationId, reportId }: { organizationId: string, reportId: string }
) {
  try {

    // Create a partial schema for validation, as updates may only contain some fields.
    const updateReportSchema = calibrationReportSchema.partial();
    const requestBody = await request.json();
    const validationResult = updateReportSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: validationResult.error.flatten() },
        { status: 400 } // Bad Request
      );
    }
    const reportData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Update report in organization
    await updateCalibrationReportInOrg(token, organizationId, reportId, reportData);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Calibration report updated successfully.", data: reportData },
      { status: 200 } // OK
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Generic error handler for any other unexpected errors.
    console.error("Error in update calibration report route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 } // Internal server error
    );
  }
}
