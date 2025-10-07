import "server-only";

import { NextRequest } from 'next/server';
import { calibrationReportPUT } from "../calibrationReportsPut";
import { calibrationReportDELETE } from "../calibrationReportsDelete";


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, reportId: string }> }
) {
  const parameters = await params;
  return await calibrationReportPUT(request, parameters);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, reportId: string }> }
) {
  const parameters = await params;
  return await calibrationReportDELETE(request, parameters);
}