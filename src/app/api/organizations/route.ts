import "server-only";

import { NextRequest } from 'next/server';

import { organizationsRoute } from "./organizationsRoute";

export async function POST(request: NextRequest) {
  return await organizationsRoute(request);
}