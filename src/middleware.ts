//Middleware should allow users to access protected routes if logged in
//Should redirect to login if not logged in
//Naively checks if a user is logged in or not based on whether
//user has a token under session-token
//A false token will be checked by appropriate resources
//when navigeted to

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
 
// 1. Specify protected and public routes
const protectedRoutes = ["/dashboard", "/settings", "/truck", "/assign", "/organization", ""];
// const publicRoutes = ["/login", "/signup", "/"];
 
export default async function middleware(req: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  // const isPublicRoute = publicRoutes.includes(path);
 
  // 3. Decrypt the session from the cookie
  const userCookies = await cookies();
  const token = userCookies.get("session-token")?.value;

 
  // 4. Redirect to /login if the user is not authenticated
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
 
  return NextResponse.next();
}
 
// Routes Middleware should not run on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};