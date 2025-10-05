import { deleteCalibrationReportFromOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles deleting a calibration report.
 * Path: DELETE /api/organizations/{organizationId}/calibrationReports/{reportId}
 */
export async function calibrationReportDELETE(
  request: NextRequest,
  { organizationId, reportId }: { organizationId: string, reportId: string }
) {
  try {

    // Get the session token from the cookies.
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Delete calibration report from organization
    await deleteCalibrationReportFromOrg(token, organizationId, reportId);

    // return success
    return NextResponse.json(
      { status: "success", message: "Calibration report deleted successfully." },
      { status: 200 } // OK
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }
    
    // Handle any other unexpected errors
    console.error("Error in DELETE calibration report route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 }
    );
  }
}