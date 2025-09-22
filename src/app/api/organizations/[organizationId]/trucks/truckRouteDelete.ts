import { deleteTruckFromOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function truckRouteDELETE(
  request: NextRequest,
  { organizationId, truckId }: { organizationId: string, truckId: string }
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

    // delete truck from organization from database
    await deleteTruckFromOrg(token, organizationId, truckId);

    // Return a success response indicating the resource was deleted.
    return NextResponse.json(
      { status: "success", message: "Truck deleted successfully." },
      { status: 200 } // OK
    );

  } catch (e) {
    // Handle specific business logic errors (e.g., not found, forbidden)
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message }, 
        { status: e.code }
      );
    }
    // Handle any other unexpected errors
    console.error("Error in DELETE truck route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 }
    );
  }
}