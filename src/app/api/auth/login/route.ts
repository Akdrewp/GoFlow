import "server-only";

// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/api/firebase/firebaseAdmin';

export async function POST(request: Request) {
  try {

    // Check if auth token exists
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: "fail", message: "Authorization token required." },
        { status: 401 } // Unauthorized
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the ID token using the Firebase Admin SDK.
    // This will throw an error if the token is invalid.
    await adminAuth.verifyIdToken(token);

    // Set the token in a secure, HTTP-only cookie.
    // HttpOnly: Prevents client-side JavaScript from accessing the cookie.
    // Secure: Ensures the cookie is only sent over HTTPS.
    // Path: The cookie is available for all routes.
    // SameSite=Strict: Mitigates CSRF attacks.
    const userCookies = await cookies();

    userCookies.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day in seconds
    });

    return NextResponse.json(
      { status: "success", data: { message: "Authentication successful" } },
      { status: 200 }, //Success
    );

  } catch (error) {
    console.error('Login API Error:', error);

    return NextResponse.json(
      { status: "error", message: "Authentication failed" },
      { status: 401 }, //Unauthorised
    );
  }
}
