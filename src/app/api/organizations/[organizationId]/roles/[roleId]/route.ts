import "server-only";

import { NextRequest } from 'next/server';
import { rolesPUT } from "../rolesPut";
import { rolesDELETE } from "../rolesDelete";


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, roleId: string }> }
) {
  const parameters = await params;
  return await rolesPUT(request, parameters);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, roleId : string }> }
) {
  const parameters = await params;
  return await rolesDELETE(request, parameters);
}