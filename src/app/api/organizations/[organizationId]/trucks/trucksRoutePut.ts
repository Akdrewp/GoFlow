import { truckSchema } from "@/api/database/database";
import { updateTruckInOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles updating a truck's information.
 * Replaces the entire truck document with the new data provided.
 */
export async function truckRoutePUT(
  request: NextRequest,
  { organizationId, truckId }: { organizationId: string, truckId: string }
) {
  try {
    console.log("truckRoutePUT CONSOLE LOG truckId: ", truckId);

    // Validate the incoming request body against the truck schema.
    const requestBody = await request.json();
    const validationResult = truckSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: "Invalid data provided.", errors: validationResult.error.flatten() },
        { status: 400 } // Bad Request
      );
    }

    // Get the session token from the cookies.
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Update truck in database
    await updateTruckInOrg(token, organizationId, truckId, validationResult.data);

    console.log("truckRoutePUT CONSOLE LOG truckData: ", validationResult.data);

    // Return a success response.
    return NextResponse.json(
      { status: "success", message: "Truck updated successfully.", data: validationResult.data },
      { status: 200 } // OK
    );

  } catch (e) {
    console.log("Error in PUT truck route:", e);

    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 } // Internal server error
    );
  }
}