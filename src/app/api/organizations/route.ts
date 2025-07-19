import "server-only";

import { NextRequest, NextResponse } from 'next/server';

import { isValidUserToken } from "@/api/firebase/firebaseVerify";

export async function POST(request: NextRequest) {
  
}