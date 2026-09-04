import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_PAYROLL } from '@/lib/staffPayrollStore';

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
  const staffId = Number(params.id);
  const payroll = INITIAL_PAYROLL.find(p => p.staff_id === staffId || p.id === staffId) || INITIAL_PAYROLL[0];

  const slipData = {
    payslip_number: `SLIP-2026-${String(payroll.id).padStart(5, '0')}`,
    month_year: payroll.month_year,
    generated_at: new Date().toISOString(),
    hotel_details: {
      name: "Hotel Blue Bird Inn & Luxury Suites",
      address: "Garacharma Main Road, Sri Vijayapuram, Andaman & Nicobar Islands 744105",
      tan_number: "ANDB12345C",
      pf_code: "AN/PRT/0048123/000",
      esi_code: "53000492810001001"
    },
    employee: {
      id: payroll.employee_id,
      name: payroll.staff_name,
      role: payroll.role,
      department: payroll.role === 'Kitchen' ? 'Food & Beverage' : payroll.role === 'Reception' ? 'Front Office' : payroll.role === 'Housekeeping' ? 'Housekeeping' : 'Operations',
      pan: "ABCDE1234F",
      bank_account: "••••••••4819",
      working_days: payroll.total_working_days,
      days_worked: payroll.days_present
    },
    earnings: [
      { label: "Basic Salary", amount: Math.round(payroll.base_salary * 0.6) },
      { label: "House Rent Allowance (HRA)", amount: Math.round(payroll.base_salary * 0.3) },
      { label: "Special Allowance", amount: Math.round(payroll.base_salary * 0.1) },
      { label: "Overtime Pay", amount: payroll.overtime_pay },
      { label: "Performance Bonus & Tips", amount: payroll.bonus + payroll.incentives }
    ],
    deductions: [
      { label: "Provident Fund (PF - 12%)", amount: payroll.pf_deduction },
      { label: "Employees' State Insurance (ESI - 0.75%)", amount: payroll.esi_deduction },
      { label: "Staff Advance Recovery", amount: payroll.advance_deduction },
      { label: "Professional Tax", amount: 200 }
    ],
    totals: {
      gross_earnings: payroll.gross_salary,
      total_deductions: payroll.pf_deduction + payroll.esi_deduction + payroll.advance_deduction + 200,
      net_pay: payroll.net_payable - 200,
      payment_status: payroll.payment_status,
      payment_mode: payroll.payment_mode || "Bank Transfer",
      transaction_ref: payroll.transaction_ref || "PENDING",
      disbursement_date: payroll.paid_at || "PENDING"
    }
  };

  return NextResponse.json(slipData, { status: 200, headers: CORS_HEADERS });
}
