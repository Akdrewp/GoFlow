import "server-only";

import { NextRequest } from 'next/server';

import { truckRoutePOST } from "./trucksRoutePost";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const parameters = await params;
  return await truckRoutePOST(request, parameters);
}