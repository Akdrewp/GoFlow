import "server-only";

import { NextRequest } from 'next/server';
import { ProductsPOST } from "./productsPost";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const parameters = await params;
  return await ProductsPOST(request, parameters);
}