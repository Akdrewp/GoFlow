import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { addCalibrationReportToOrg } from '@/api/firebase/firebaseService';
import { FirestoreDatabaseError } from '@/api/firebase/firestoreDatabase';
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { createCalibrationReportSchema } from "@/api/database/database";

/**
 * This route handles the creation of a calibration report for a specific organization.
 * Path: POST /api/organizations/{organizationId}/calibrationReports
 */
export async function CalibrationReportPOST(
  request: NextRequest,
  { organizationId }: { organizationId: string }
) {
  try {
    
    // Validate the incoming request body against the calibration chart schema.
    const requestBody = await request.json();
    const validationResult = createCalibrationReportSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.log("ZOD error: ", validationResult.error.message);

      return NextResponse.json(
        { status: "fail", message: validationResult.error.message },
        { status: 400 } // Bad Request
      );
    }
    const chartData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Add calibration chart to organization
    const createdReport = await addCalibrationReportToOrg(token, organizationId, chartData);

    // Return created 
    return NextResponse.json(
      { status: "success", message: "Calibration chart successfully created.", data: createdReport },
      { status: 201 } // Created
    );

  } catch (e) {
    console.log("Error in create calibration chart route:", e);
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Generic error handler for any other unexpected errors.
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}
