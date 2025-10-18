import "server-only";

import { NextRequest } from 'next/server';
import { employeesPUT } from "../employeesPut";
import { employeesDELETE } from "../employeesDelete";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, employeeId: string }> }
) {
  const parameters = await params;
  return await employeesPUT(request, parameters);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, employeeId: string }> }
) {
  const parameters = await params;
  return await employeesDELETE(request, parameters);
}