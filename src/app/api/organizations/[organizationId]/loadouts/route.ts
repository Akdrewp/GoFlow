import "server-only";

import { NextRequest } from 'next/server';
import { loadoutPOST } from "./loadoutPost";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const parameters = await params;
  return await loadoutPOST(request, parameters);
}