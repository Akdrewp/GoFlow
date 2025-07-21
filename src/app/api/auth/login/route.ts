import "server-only";

// app/api/auth/login/route.ts
import { NextRequest } from 'next/server';

import { loginRoute } from "./loginRoute";

export async function POST(request: NextRequest) {
  return await loginRoute(request);
}
