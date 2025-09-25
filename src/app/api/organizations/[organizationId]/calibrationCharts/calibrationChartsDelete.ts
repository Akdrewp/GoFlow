import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { deleteChartFromOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";

/**
 * This route handles the deletion of a chart
 * Path: PUT /api/organizations/{organizationId}/calibrationCharts/{chartId}
 */
export async function calibrationChartsDELETE(
  request: NextRequest,
  { organizationId, chartId }: { organizationId: string, chartId: string }
) {
  try {

    console.log("calibrationChartsDelete CONSOLE LOG TEST TEST TEST");
    // const calibrationChartData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Delete chart from database
    await deleteChartFromOrg(token, organizationId, chartId);

    // Return a successful response.
    return NextResponse.json(
      { status: "success", message: "Truck successfully created.", data: "calibrationChartData" },
      { status: 200 } // Success
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Genereic error handler
    console.error("Error in Delete truck route:", e);
    return NextResponse.json(
      { status: "error", message: `An internal server error occurred. ${e}` },
      { status: 500 } // Internal Server Error
    );
  }
}