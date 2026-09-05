import { NextRequest, NextResponse } from 'next/server';
import { updateStaffSalaryRecord, INITIAL_PAYROLL } from '@/lib/staffPayrollStore';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const record = INITIAL_PAYROLL.find(p => p.id === id || p.staff_id === id);

  if (!record) {
    return NextResponse.json({ error: `Payroll record #${id} not found` }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json({ record }, { status: 200, headers: CORS_HEADERS });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const body = await req.json();

    const updated = updateStaffSalaryRecord(id, body);
    if (!updated) {
      return NextResponse.json({ error: `Payroll record #${id} not found` }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json({
      status: "success",
      message: `Salary for ${updated.staff_name} updated successfully!`,
      record: updated
    }, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update salary' }, { status: 500, headers: CORS_HEADERS });
  }
}
