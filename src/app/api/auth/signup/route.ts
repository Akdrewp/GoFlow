import "server-only";

import { NextRequest } from 'next/server';

import { signUpRoute } from "./signUpRoutePost";

export async function POST(request: NextRequest) {
  return await signUpRoute(request);
}

/**
 * @todo
 * @param request
 */
export async function DELETE(request: Request) {

}