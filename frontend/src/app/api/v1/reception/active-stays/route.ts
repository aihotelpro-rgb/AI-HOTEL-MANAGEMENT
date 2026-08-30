import { NextResponse } from 'next/server';
import { getActiveStays } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET() {
  const stays = getActiveStays().filter((s) => s.status === 'CheckedIn');
  return NextResponse.json(stays, { status: 200, headers: CORS_HEADERS });
}
