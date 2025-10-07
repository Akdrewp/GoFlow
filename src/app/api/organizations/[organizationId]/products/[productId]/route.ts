import "server-only";

import { NextRequest } from 'next/server';
import { ProductsPUT as productsPUT } from "../productsPut";
import { productsDELETE } from "../productsDelete";


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, productId: string }> }
) {
  const parameters = await params;
  return await productsPUT(request, parameters);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string, productId: string }> }
) {
  const parameters = await params;
  return await productsDELETE(request, parameters);
}