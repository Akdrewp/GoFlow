import "server-only";

import { NextRequest } from 'next/server';

import { signUpRoute } from "./signUpRoute";

export async function POST(request: NextRequest) {
  return await signUpRoute(request);
}