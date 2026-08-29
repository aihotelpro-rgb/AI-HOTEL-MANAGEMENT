import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = (body.username || 'admin').toLowerCase();
    
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      reception: 'Reception',
      kitchen: 'Kitchen',
      housekeeping: 'Housekeeping',
      manager: 'Executive'
    };
    
    const role = roleMap[username] || 'Admin';

    return NextResponse.json(
      {
        access_token: `ver_jwt_token_${Date.now()}_${username}`,
        token_type: 'bearer',
        role: role,
        username: username
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ detail: 'Login failed' }, { status: 400 });
  }
}
