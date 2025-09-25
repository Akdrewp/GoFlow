import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { calibrationChartSchema } from "@/api/database/database";
import { addChartToOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";

/**
 * This route handles the creation of a new calibration chart
 * Path: POST /api/organizations/{organizationId}/calibrationCharts
 */
export async function calibrationChartsPOST(
  request: NextRequest,
  { organizationId }: { organizationId: string }
) {
  try {

    // Validate the incoming request body against the truck schema.
    const requestBody = await request.json();
    const validationResult = calibrationChartSchema.safeParse(requestBody);

    // Check if validation failed
    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: validationResult.error.message },
        { status: 400 } // Bad Request
      );
    }
    const calibrationChartData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // add calibrationChart to database
    await addChartToOrg(token, organizationId, calibrationChartData);

    // Return a successful response.
    return NextResponse.json(
      { status: "success", message: "Truck successfully created.", data: calibrationChartData },
      { status: 201 } // Created
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Genereic error handler
    console.error("Error in create truck route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}