import "server-only";

import { NextRequest } from 'next/server';
import { truckRoutePUT } from "../trucksRoutePut";
import { truckRouteDELETE } from "../truckRouteDelete";


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, truckId: string }> }
) {
  const parameters = await params;
  return await truckRoutePUT(request, parameters);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, truckId: string }> }
) {
  const parameters = await params;
  return await truckRouteDELETE(request, parameters);
}