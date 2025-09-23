import "server-only";

import { NextRequest } from 'next/server';
import { calibrationChartsPUT } from "../calibrationChartsPut";
import { calibrationChartsDELETE } from "../calibtraionChartsDelete";


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, chartId: string }> }
) {
  const parameters = await params;
  return await calibrationChartsPUT(request, parameters);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, chartId: string }> }
) {
  const parameters = await params;
  return await calibrationChartsDELETE(request, parameters);
}