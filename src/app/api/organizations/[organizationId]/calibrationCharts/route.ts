import "server-only";

import { NextRequest } from 'next/server';
import { calibrationChartsPOST } from "./calibrationChartsPost";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const parameters = await params;
  return await calibrationChartsPOST(request, parameters);
}