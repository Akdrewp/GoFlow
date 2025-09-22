import "server-only";
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { truckSchema } from '@/api/database/database';
import { addTruckToOrg } from '@/api/firebase/firebaseService';
import { FirestoreDatabaseError } from '@/api/firebase/firestoreDatabase';
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";

/**
 * This route handles the creation of a new truck for a specific organization.
 * Path: POST /api/organizations/{organizationId}/trucks
 */
export async function truckRoutePOST(
  request: NextRequest,
  { organizationId }: { organizationId: string }
) {
  try {

    // Validate the incoming request body against the truck schema.
    const requestBody = await request.json();
    const validationResult = truckSchema.safeParse(requestBody);

    // Check if validation failed
    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: "Invalid data provided.", errors: validationResult.error.flatten() },
        { status: 400 } // Bad Request
      );
    }
    const truckData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Add truck to organization
    await addTruckToOrg(token, organizationId, truckData);

    // 4. Return a successful response.
    return NextResponse.json(
      { status: "success", message: "Truck successfully created.", data: truckData },
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

