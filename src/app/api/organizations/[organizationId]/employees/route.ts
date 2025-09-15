import "server-only";

import { NextRequest } from 'next/server';

import { employeesRoute } from "@/app/api/organizations/[organizationId]/employees/employeesRoute";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const parameters = await params;
  return await employeesRoute(request, parameters);
}