import SignUpPage from "@/app/signup/SignUp";
import { isValidUserToken } from "@/api/firebase/firebaseVerify";
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function SignUp() {

  // 1. Read the token from the secure cookie.
  const userCookies = await cookies();
  const token = userCookies.get('session-token')?.value;

  let shouldRedirect = false;
  // If user has a token check if its valid
  if (token) {
    try {
      await isValidUserToken(token);

      console.log("USER IS LOGGED IN ON SIGN UP PAGE REDIRECTING TO /DASHBOARD");

      //User is logged in and token is valid redirect to /dashboard
      shouldRedirect = true;
    } catch(e) { //User token is invalid, user should stay on signUp
      console.log("User token invalid. Staying on signup", e);
    }
  }

  //If user was logged in trying to access signUp page redirect to /dashboard
  if (shouldRedirect) {
    redirect("/dashboard");
  }

  console.log("TEST");

  return (
    <SignUpPage/>
  );
}