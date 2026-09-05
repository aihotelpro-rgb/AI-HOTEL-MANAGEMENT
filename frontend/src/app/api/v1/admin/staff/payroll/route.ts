import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_PAYROLL, disburseStaffSalary, updateStaffSalaryRecord } from '@/lib/staffPayrollStore';

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
  const month = searchParams.get('month') || 'Sep 2026';

  const list = INITIAL_PAYROLL.filter(p => !month || p.month_year.toLowerCase() === month.toLowerCase());

  const totalDisbursed = list.filter(p => p.payment_status === 'Paid').reduce((sum, p) => sum + p.net_payable, 0);
  const totalPending = list.filter(p => p.payment_status !== 'Paid').reduce((sum, p) => sum + p.net_payable, 0);

  return NextResponse.json({
    month_year: month,
    summary: {
      total_staff: list.length,
      paid_count: list.filter(p => p.payment_status === 'Paid').length,
      pending_count: list.filter(p => p.payment_status !== 'Paid').length,
      total_disbursed_inr: totalDisbursed,
      total_pending_inr: totalPending
    },
    payroll_sheet: list
  }, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payroll_id, payment_mode, transaction_ref } = body;

    if (!payroll_id) {
      return NextResponse.json({ error: 'payroll_id is required' }, { status: 400, headers: CORS_HEADERS });
    }

    const updated = disburseStaffSalary(Number(payroll_id), payment_mode || 'Bank Transfer', transaction_ref);
    if (!updated) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json({
      status: "success",
      message: `Salary of ₹${updated.net_payable.toLocaleString('en-IN')} disbursed to ${updated.staff_name} via ${updated.payment_mode}`,
      record: updated
    }, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process salary payment' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      payroll_id, 
      base_salary, 
      days_present, 
      total_working_days, 
      overtime_hours, 
      overtime_pay, 
      bonus, 
      incentives, 
      pf_deduction, 
      esi_deduction, 
      advance_deduction,
      payment_mode,
      payment_status 
    } = body;

    if (!payroll_id) {
      return NextResponse.json({ error: 'payroll_id is required to update salary' }, { status: 400, headers: CORS_HEADERS });
    }

    const updated = updateStaffSalaryRecord(Number(payroll_id), {
      base_salary,
      days_present,
      total_working_days,
      overtime_hours,
      overtime_pay,
      bonus,
      incentives,
      pf_deduction,
      esi_deduction,
      advance_deduction,
      payment_mode,
      payment_status
    });

    if (!updated) {
      return NextResponse.json({ error: `Payroll record #${payroll_id} not found` }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json({
      status: "success",
      message: `Salary configuration for ${updated.staff_name} updated successfully. Net Payable: ₹${updated.net_payable.toLocaleString('en-IN')}`,
      record: updated
    }, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update salary' }, { status: 500, headers: CORS_HEADERS });
  }
}
