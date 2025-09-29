import "server-only";

import { NextRequest } from 'next/server';
import { assignmentsPOST } from "./assignmentsPost";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const parameters = await params;
  return await assignmentsPOST(request, parameters);
}