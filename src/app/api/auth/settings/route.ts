import "server-only";

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {

  console.log("Sending settings data");
  return NextResponse.json(
    { status: "success", message: "Authorization complete", data: "fake data" },
    { status: 200 },
  );
}