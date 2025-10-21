import "server-only";

import { NextResponse } from 'next/server';

export async function POST() {

  console.log("Sending settings data");
  return NextResponse.json(
    { status: "success", message: "Authorization complete", data: "fake data" },
    { status: 200 },
  );
}