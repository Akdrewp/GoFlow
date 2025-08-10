import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { employeeSchema } from '@/api/database/database';
import { canUserAccessData, AccessType } from '@/api/firebase/firebaseVerify';
import { firebaseDatabase } from '@/api/firebase/firestoreDatabase';

// The second argument to the POST function is a context object
// that contains the dynamic route parameters.
// route is /api/organizations/organizationId/employees
export async function employeesRoute(
    request: NextRequest, 
    { organizationId }: { organizationId: string }
) {

  // Check sent data agianst organization schema
  // Only check for name, email, and organizationId since
  // Those are the form data
  const parsedReq = await request.json();
  const isValidUserFormData = employeeSchema.safeParse(parsedReq);

  if (!isValidUserFormData.success) {
      console.log("SERVER LOG: === Returning 400 - Zod Validation Failed ===");
      return NextResponse.json(
        { status: "fail", message: isValidUserFormData.error.message }, 
        { status: 400 }); //Bad Request User Error
  }

  //Destructure form data
  const { name, role, status, employeeId } = isValidUserFormData.data;

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

  //Get resourceId and check whether user can create an organization
  const resourceId = `organizations/${organizationId}/employees`;
  //User is tring to write to employees
  const parsedCanUserAccessData = await canUserAccessData(token, resourceId, AccessType.WRITE);
  //Anything past this can write to employees

  /**
   * @todo If user not allowed to create an account
   * This is always be defined but I might change it or the function name
  */
  if (!parsedCanUserAccessData) {

  }

  const employeeAlreadyExists = await firebaseDatabase.employee.existsInOrg(organizationId, employeeId);

  if (employeeAlreadyExists) {
      return NextResponse.json(
          { status: "fail", message: "Employee with passed information already exists" },
          { status: 409 } //Conflict
      );
  }

  // User has permission to write to employees
  // Data matches schema and employee doesn't already exist
  // Add employee to database

  await firebaseDatabase.organization.addEmployee(organizationId, {
    name: name,
    role: role,
    status: status,
    employeeId: employeeId
  });

  return NextResponse.json(
    { status: "success", message: "Employee added to organization", data: isValidUserFormData.data },
    { status: 201 } //Created
  );
}
