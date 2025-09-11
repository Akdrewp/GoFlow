import "server-only";

import { NextRequest } from 'next/server';

import { rolesRoute } from "./rolesRoute";

export async function POST(request: NextRequest) {
  return await rolesRoute(request);
}