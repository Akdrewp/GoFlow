import "server-only";

import { NextRequest } from 'next/server';
import { assignmentsPUT } from "../assignmentsPut";
import { assignmentsDELETE } from "../assignmentsDelete";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, assignmentId: string }> }
) {
  const parameters = await params;
  return await assignmentsPUT(request, parameters);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, assignmentId: string }> }
) {
  const parameters = await params;
  return await assignmentsDELETE(request, parameters);
}