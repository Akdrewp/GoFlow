import "server-only";

import { NextRequest } from 'next/server';
import { loadoutPUT } from "../loadoutPut";
import { loadoutDELETE } from "../loadoutDelete";


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, loadoutId: string }> }
) {
  const parameters = await params;
  return await loadoutPUT(request, parameters);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, loadoutId: string }> }
) {
  const parameters = await params;
  return await loadoutDELETE(request, parameters);
}