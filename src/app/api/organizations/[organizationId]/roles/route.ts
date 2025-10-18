import "server-only";

import { NextRequest } from 'next/server';

import { rolesPOST } from "./rolesRoute";

export async function POST(request: NextRequest) {
  return await rolesPOST(request);
}