import { deleteProductFromOrg } from "@/api/firebase/firebaseService/productService";
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { FirestoreDatabaseError } from "@/api/firebase/firestoreDatabase";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles deleting a product from an organization.
 * Path: DELETE /api/organizations/{organizationId}/products/{productId}
 */
export async function productsDELETE(
  request: NextRequest,
  { organizationId , productId } : { organizationId: string, productId: string }
) {
  try {

    // Get user token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." }, 
        { status: 401 } // Unauthorized
      );
    }

    // Call the business logic service to delete the product.
    await deleteProductFromOrg(token, organizationId, productId);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Product deleted successfully." },
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
    console.error("Error in DELETE product route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." }, 
      { status: 500 }
    );
  }
}