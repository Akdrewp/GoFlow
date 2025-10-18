import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { employeeSchema } from '@/api/database/database';
import { FirebaseVerifyError } from '@/api/firebase/firebaseVerify';
import { addEmployeeToOrg } from '@/api/firebase/firebaseService';
import { FirestoreDatabaseError } from '@/api/firebase/firestoreDatabase';

// The second argument to the POST function is a context object
// that contains the dynamic route parameters.
// route is /api/organizations/organizationId/employees
export async function employeesPOST(
  request: NextRequest, 
  { organizationId }: { organizationId: string }
) {
  try {
    // Check sent data agianst organization schema
    // Only check for name, email, and organizationId since
    // Those are the form data
    const parsedReq = await request.json();
    const isValidUserFormData = employeeSchema.safeParse(parsedReq);

    if (!isValidUserFormData.success) {
      console.log("SERVER LOG: === Returning 400 - Zod Validation Failed ===");
      return NextResponse.json(
        { status: "fail", message: isValidUserFormData.error.message }, 
        { status: 400 } //Bad Request User Error
      );
    }

    //Destructure form data
    const { name, roleId, employeeId } = isValidUserFormData.data;

    //Get session token
    const userCookies = await cookies();
    const token = userCookies.get('session-token')?.value;
    //Check if there is a token
    if (!token) {
      return NextResponse.json(
        { status: "fail", message: "Authentication required." },
        { status: 401 } //Unauthorized
      );
    }

    // Add employee via firebaseVerify
    await addEmployeeToOrg(token, organizationId, {
      name: name,
      roleId: roleId,
      employeeId: employeeId
    });

    return NextResponse.json(
      { status: "success", message: "Employee added to organization", data: isValidUserFormData.data },
      { status: 201 } //Created
    );
  } catch (e) {

    if (e instanceof FirebaseVerifyError || e instanceof FirestoreDatabaseError) {
      return NextResponse.json(
        { status: "fail", message: e.message },
        { status: e.code }
      );
    }

    // Catch any unexpected errors from the service layer or elsewhere
    console.error("Error in add employee route:", e);
    return NextResponse.json(
      { status: "error", message: "An internal server error occurred." },
      { status: 500 } // Internal Server Error
    );
  }
}
