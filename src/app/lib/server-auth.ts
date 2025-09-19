// app/lib/server-auth.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * A higher-order function to wrap server-side logic that requires authentication.
 * It handles getting the session token, and manages redirects and session
 * clearing on authentication failure.
 * 
 * Any error thrown to this function should be a authentication
 * based error NOT authorization
 * * @param action The async function to execute if the user is authenticated.
 * This function receives the verified token as its argument.
 * @returns The result of the action function.
 */
export async function withServerAuth<T>(
  action: (token: string) => Promise<T>
): Promise<T> {
  console.log("RUNNING WITH SERVER AUTH");

  // Read cookie and get token
  const userCookies = await cookies();
  const token = userCookies.get('session-token')?.value;

  // 2. Redirect to login if no token is found.
  //This should be caught by middleware but extra redunancy is fine
  if (!token) {
    redirect('/login');
  }

  try {
    // 3. Execute the provided action with the token.
    // If the token is invalid/expired, this will throw an error.
    return await action(token);
  } catch (error) {
    console.log("WITH SERVER AUTH ERROR", error);
    // 4. Handle authentication errors.
    // This block catches errors thrown from functions like `verifyIdToken`.
    console.error("Server-side authentication error:", (error as Error).message);

    // Redirect the user to the login page.
    redirect('/login');
  }
}
