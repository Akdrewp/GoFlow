import "server-only";

import { NextRequest } from 'next/server';

import { employeesPOST } from "@/app/api/organizations/[organizationId]/employees/employeesPost";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const parameters = await params;
  return await employeesPOST(request, parameters);
}