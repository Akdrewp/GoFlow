import { productSchema } from "@/api/database/database";
import { updateProductInOrg } from "@/api/firebase/firebaseService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";


/**
 * Handles updating a product's information.
 * This function handles partial updates to a product.
 * Path: PUT /api/organizations/{organizationId}/products/{productId}
 */
export async function ProductsPUT(
  request: NextRequest,
  { organizationId , productId } : { organizationId: string, productId: string }
) {
  try {

    // Create a partial schema for validation, as updates may only contain some fields.
    const updateProductSchema = productSchema.partial();
    const requestBody = await request.json();
    const validationResult = updateProductSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "fail", message: validationResult.error.flatten() },
        { status: 400 } // Bad Request
      );
    }
    const productData = validationResult.data;

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } // Unauthorized
      );
    }

    // Update product in organization
    await updateProductInOrg(token, organizationId, productId, productData);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Product updated successfully.", data: productData },
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
    console.error("Error in update product route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 } // Internal server error
    );
  }
}