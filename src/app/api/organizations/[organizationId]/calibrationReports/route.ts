import "server-only";

import { NextRequest } from 'next/server';
import { CalibrationReportPOST } from "./calibrationReportsPost";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const parameters = await params;
  return await CalibrationReportPOST(request, parameters);
}