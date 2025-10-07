import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { productSchema } from "@/api/database/database";
import { addProductToOrg } from "@/api/firebase/firebaseService/productService";
import { FirestoreDatabaseError } from '@/api/firebase/firestoreDatabase';
import { FirebaseVerifyError } from "@/api/firebase/firebaseVerify";

/**
 * This route handles the creation of a new product for a specific organization.
 * Path: POST /api/organizations/{organizationId}/products
 */
export async function ProductsPOST(
  request: NextRequest,
  { organizationId }: { organizationId: string }
) {
  try {

    // Validate the incoming request body against the product schema.
    const requestBody = await request.json();
    const validationResult = productSchema.safeParse(requestBody);

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

    // Add product to organization
    await addProductToOrg(token, organizationId, productData);

    // Return success
    return NextResponse.json(
      { status: "success", message: "Product successfully created.", data: productData },
      { status: 201 } // Created
    );

  } catch (e) {
    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Generic error handler for any other unexpected errors.
    console.error("Error in create product route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}
