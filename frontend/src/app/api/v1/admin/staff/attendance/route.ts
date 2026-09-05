import { NextRequest, NextResponse } from 'next/server';
import { 
  INITIAL_ATTENDANCE, 
  getAttendanceByDate, 
  getMonthlyAttendanceRoster, 
  updateStaffAttendance 
} from '@/lib/staffPayrollStore';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view');
  const month = searchParams.get('month');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (view === 'monthly' || month) {
    const targetMonth = month || date.slice(0, 7);
    const roster = getMonthlyAttendanceRoster(targetMonth);
    return NextResponse.json({
      month: targetMonth,
      roster
    }, { status: 200, headers: CORS_HEADERS });
  }

  let list = getAttendanceByDate(date);
  if (list.length === 0 && date === new Date().toISOString().split('T')[0]) {
    list = INITIAL_ATTENDANCE.filter(a => a.date === date);
  }

  return NextResponse.json(list, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staff_id, date, status, clock_in, clock_out, total_hours, notes, staff_name, employee_id, role } = body;

    const todayDate = date || new Date().toISOString().split('T')[0];
    const record = updateStaffAttendance(Number(staff_id), todayDate, {
      staff_name,
      employee_id,
      role,
      status,
      clock_in,
      clock_out,
      total_hours: total_hours !== undefined ? Number(total_hours) : undefined,
      notes
    });

    return NextResponse.json({
      status: "success",
      message: `Attendance marked for ${record.staff_name} on ${todayDate} as ${record.status}`,
      record
    }, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update attendance' }, { status: 500, headers: CORS_HEADERS });
  }
}
