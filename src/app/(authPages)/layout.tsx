"server only";

import { isValidUserToken } from '@/api/firebase/firebaseVerify';
import { withServerAuth } from '../lib/server-auth';
import AuthLayout from './AuthLayout';
import { getAssignmentFromUser, getEmployeeFromOrg, getUser, isManagerRole } from '@/api/firebase/firebaseService';
import { UserContextProvider } from '../lib/contexts/UserContext';

// Get the initial user context barring any use elsewhere
async function getUserContext() {
  console.log("Getting user context");

  const initialUserContext = await withServerAuth(async (token) => {
    try {
      // Get userInfo
      const userDecodedIdToken = await isValidUserToken(token);
      const userUid = userDecodedIdToken.uid;
      const userProfile = await getUser(token, userUid);

      if (userProfile.type == "organization") {
        const organizationId = userProfile.organizationId;
        // Get employee profile and current assignment
        const employee = await getEmployeeFromOrg(token, organizationId, userProfile.employeeId);
        const currentAssignment = await getAssignmentFromUser(token, organizationId, userProfile.uid);

        // Get manager status
        const isManager = await isManagerRole(token, organizationId, employee.roleId);

        return {
          user: userProfile,
          employee: employee,
          assignment: currentAssignment,
          isManager: isManager,
        };   
      } else {
        return {
          user: userProfile,
          employee: undefined,
          assignment: undefined,
          isManager: false,
        };
      }

    } catch (e) {
      console.log(e);
      return undefined;
    }
  });
  
  // Convert to JSON object to pass "complex" objects through react components
  return initialUserContext ? JSON.parse(JSON.stringify(initialUserContext)) : undefined;
  
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const initialContext = await getUserContext();

  return (
    <UserContextProvider initialValue={initialContext}>
      <AuthLayout>
        {children}
      </AuthLayout>
    </UserContextProvider>
  );
}

