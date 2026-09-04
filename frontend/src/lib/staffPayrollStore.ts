// ─────────────────────────────────────────────────────────────────────────────
// STAFF ATTENDANCE & PAYROLL STORE (In-Memory & Dual Disk/LocalStorage Persisted)
// ─────────────────────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: number;
  staff_id: number;
  staff_name: string;
  employee_id: string;
  role: string;
  date: string; // YYYY-MM-DD
  clock_in?: string; // HH:mm:ss
  clock_out?: string; // HH:mm:ss
  status: 'Present' | 'Late' | 'HalfDay' | 'Absent' | 'OnLeave';
  total_hours: number;
  notes?: string;
}

export interface StaffSalaryConfig {
  staff_id: number;
  base_monthly_salary: number;
  hourly_overtime_rate: number;
  pf_deduction_percent: number;
  esi_deduction_percent: number;
  bank_account_number: string;
  bank_ifsc: string;
  upi_id: string;
  pan_number: string;
}

export interface PayrollRecord {
  id: number;
  staff_id: number;
  staff_name: string;
  employee_id: string;
  role: string;
  month_year: string; // e.g. "Sep 2026"
  base_salary: number;
  total_working_days: number;
  days_present: number;
  overtime_hours: number;
  overtime_pay: number;
  bonus: number;
  incentives: number;
  pf_deduction: number;
  esi_deduction: number;
  advance_deduction: number;
  gross_salary: number;
  net_payable: number;
  payment_status: 'Unpaid' | 'Processing' | 'Paid';
  payment_mode?: 'Bank Transfer' | 'UPI' | 'Cash';
  paid_at?: string;
  transaction_ref?: string;
}

const todayStr = new Date().toISOString().split('T')[0];

export let INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 1, staff_id: 1, staff_name: "Maharani Gayatri Devi", employee_id: "EMP-0001", role: "Admin", date: todayStr, clock_in: "08:55 AM", clock_out: "06:05 PM", status: "Present", total_hours: 9.1 },
  { id: 2, staff_id: 2, staff_name: "Aarav Sharma", employee_id: "EMP-1021", role: "Reception", date: todayStr, clock_in: "06:58 AM", clock_out: "03:32 PM", status: "Present", total_hours: 8.5 },
  { id: 3, staff_id: 3, staff_name: "Executive Chef Ranveer Brar", employee_id: "EMP-2045", role: "Kitchen", date: todayStr, clock_in: "10:45 AM", clock_out: "10:15 PM", status: "Present", total_hours: 11.5 },
  { id: 4, staff_id: 4, staff_name: "Runner Vikram Rathore", employee_id: "RUN-401", role: "Runner", date: todayStr, clock_in: "07:12 AM", clock_out: "03:45 PM", status: "Present", total_hours: 8.5 },
  { id: 5, staff_id: 5, staff_name: "Runner Amit Verma", employee_id: "RUN-402", role: "Runner", date: todayStr, clock_in: "03:15 PM", clock_out: "11:30 PM", status: "Present", total_hours: 8.2 },
  { id: 6, staff_id: 6, staff_name: "Runner Priya Sundaram", employee_id: "RUN-403", role: "Runner", date: todayStr, clock_in: "10:05 AM", clock_out: "06:30 PM", status: "Present", total_hours: 8.4 },
  { id: 7, staff_id: 7, staff_name: "Executive Butler Rahul Kapoor", employee_id: "BTL-501", role: "Butler", date: todayStr, clock_in: "08:00 AM", clock_out: "08:00 PM", status: "Present", total_hours: 12.0 },
  { id: 8, staff_id: 8, staff_name: "Ramesh Kumar (Chief Tech)", employee_id: "ENG-601", role: "Maintenance", date: todayStr, clock_in: "08:30 AM", clock_out: "05:15 PM", status: "Present", total_hours: 8.7 },
  { id: 9, staff_id: 9, staff_name: "Sunita Rawat", employee_id: "EMP-3012", role: "Housekeeping", date: todayStr, clock_in: "07:05 AM", clock_out: "03:30 PM", status: "Present", total_hours: 8.4 },
  { id: 10, staff_id: 10, staff_name: "Vikramaditya Rathore", employee_id: "EMP-0010", role: "Executive", date: todayStr, clock_in: "07:45 AM", clock_out: "07:30 PM", status: "Present", total_hours: 11.7 }
];

export let INITIAL_PAYROLL: PayrollRecord[] = [
  {
    id: 1,
    staff_id: 1,
    staff_name: "Maharani Gayatri Devi",
    employee_id: "EMP-0001",
    role: "Admin",
    month_year: "Sep 2026",
    base_salary: 85000,
    total_working_days: 30,
    days_present: 30,
    overtime_hours: 8,
    overtime_pay: 3200,
    bonus: 5000,
    incentives: 2500,
    pf_deduction: 4250,
    esi_deduction: 637,
    advance_deduction: 0,
    gross_salary: 95700,
    net_payable: 90813,
    payment_status: "Paid",
    payment_mode: "Bank Transfer",
    paid_at: "2026-09-01T10:00:00Z",
    transaction_ref: "HDFC-NEFT-99182319"
  },
  {
    id: 2,
    staff_id: 2,
    staff_name: "Aarav Sharma",
    employee_id: "EMP-1021",
    role: "Reception",
    month_year: "Sep 2026",
    base_salary: 38000,
    total_working_days: 30,
    days_present: 28,
    overtime_hours: 12,
    overtime_pay: 2280,
    bonus: 2000,
    incentives: 1500,
    pf_deduction: 1900,
    esi_deduction: 285,
    advance_deduction: 0,
    gross_salary: 41780,
    net_payable: 39595,
    payment_status: "Paid",
    payment_mode: "UPI",
    paid_at: "2026-09-01T10:30:00Z",
    transaction_ref: "UPI/260901293847@sbi"
  },
  {
    id: 3,
    staff_id: 3,
    staff_name: "Executive Chef Ranveer Brar",
    employee_id: "EMP-2045",
    role: "Kitchen",
    month_year: "Sep 2026",
    base_salary: 75000,
    total_working_days: 30,
    days_present: 29,
    overtime_hours: 16,
    overtime_pay: 6000,
    bonus: 4000,
    incentives: 3000,
    pf_deduction: 3750,
    esi_deduction: 562,
    advance_deduction: 0,
    gross_salary: 88000,
    net_payable: 83688,
    payment_status: "Paid",
    payment_mode: "Bank Transfer",
    paid_at: "2026-09-01T11:00:00Z",
    transaction_ref: "ICICI-IMPS-88492019"
  },
  {
    id: 4,
    staff_id: 4,
    staff_name: "Runner Vikram Rathore",
    employee_id: "RUN-401",
    role: "Runner",
    month_year: "Sep 2026",
    base_salary: 24000,
    total_working_days: 30,
    days_present: 28,
    overtime_hours: 20,
    overtime_pay: 2400,
    bonus: 1000,
    incentives: 1200,
    pf_deduction: 1200,
    esi_deduction: 180,
    advance_deduction: 0,
    gross_salary: 28600,
    net_payable: 27220,
    payment_status: "Unpaid",
    payment_mode: "Bank Transfer"
  },
  {
    id: 5,
    staff_id: 5,
    staff_name: "Runner Amit Verma",
    employee_id: "RUN-402",
    role: "Runner",
    month_year: "Sep 2026",
    base_salary: 24000,
    total_working_days: 30,
    days_present: 27,
    overtime_hours: 15,
    overtime_pay: 1800,
    bonus: 1000,
    incentives: 800,
    pf_deduction: 1200,
    esi_deduction: 180,
    advance_deduction: 2000,
    gross_salary: 27600,
    net_payable: 24220,
    payment_status: "Unpaid",
    payment_mode: "UPI"
  },
  {
    id: 6,
    staff_id: 6,
    staff_name: "Runner Priya Sundaram",
    employee_id: "RUN-403",
    role: "Runner",
    month_year: "Sep 2026",
    base_salary: 25000,
    total_working_days: 30,
    days_present: 29,
    overtime_hours: 10,
    overtime_pay: 1250,
    bonus: 1200,
    incentives: 1000,
    pf_deduction: 1250,
    esi_deduction: 187,
    advance_deduction: 0,
    gross_salary: 28450,
    net_payable: 27013,
    payment_status: "Unpaid",
    payment_mode: "UPI"
  },
  {
    id: 7,
    staff_id: 7,
    staff_name: "Executive Butler Rahul Kapoor",
    employee_id: "BTL-501",
    role: "Butler",
    month_year: "Sep 2026",
    base_salary: 45000,
    total_working_days: 30,
    days_present: 30,
    overtime_hours: 24,
    overtime_pay: 5400,
    bonus: 3000,
    incentives: 2500,
    pf_deduction: 2250,
    esi_deduction: 337,
    advance_deduction: 0,
    gross_salary: 55900,
    net_payable: 53313,
    payment_status: "Paid",
    payment_mode: "Bank Transfer",
    paid_at: "2026-09-01T12:00:00Z",
    transaction_ref: "AXIS-NEFT-77123984"
  },
  {
    id: 8,
    staff_id: 8,
    staff_name: "Ramesh Kumar (Chief Tech)",
    employee_id: "ENG-601",
    role: "Maintenance",
    month_year: "Sep 2026",
    base_salary: 35000,
    total_working_days: 30,
    days_present: 28,
    overtime_hours: 8,
    overtime_pay: 1400,
    bonus: 1500,
    incentives: 1000,
    pf_deduction: 1750,
    esi_deduction: 262,
    advance_deduction: 0,
    gross_salary: 38900,
    net_payable: 36888,
    payment_status: "Unpaid",
    payment_mode: "Bank Transfer"
  },
  {
    id: 9,
    staff_id: 9,
    staff_name: "Sunita Rawat",
    employee_id: "EMP-3012",
    role: "Housekeeping",
    month_year: "Sep 2026",
    base_salary: 22000,
    total_working_days: 30,
    days_present: 28,
    overtime_hours: 14,
    overtime_pay: 1540,
    bonus: 1000,
    incentives: 1000,
    pf_deduction: 1100,
    esi_deduction: 165,
    advance_deduction: 0,
    gross_salary: 25540,
    net_payable: 24275,
    payment_status: "Unpaid",
    payment_mode: "Cash"
  },
  {
    id: 10,
    staff_id: 10,
    staff_name: "Vikramaditya Rathore",
    employee_id: "EMP-0010",
    role: "Executive",
    month_year: "Sep 2026",
    base_salary: 95000,
    total_working_days: 30,
    days_present: 30,
    overtime_hours: 0,
    overtime_pay: 0,
    bonus: 8000,
    incentives: 4500,
    pf_deduction: 4750,
    esi_deduction: 712,
    advance_deduction: 0,
    gross_salary: 107500,
    net_payable: 102038,
    payment_status: "Paid",
    payment_mode: "Bank Transfer",
    paid_at: "2026-09-01T09:30:00Z",
    transaction_ref: "SBI-RTGS-11223344"
  }
];

export function getAttendanceByDate(targetDate: string): AttendanceRecord[] {
  return INITIAL_ATTENDANCE.filter(a => a.date === targetDate);
}

export function updateStaffAttendance(
  staff_id: number,
  date: string,
  updates: Partial<AttendanceRecord>
): AttendanceRecord {
  let record = INITIAL_ATTENDANCE.find(a => a.staff_id === staff_id && a.date === date);
  if (!record) {
    record = {
      id: INITIAL_ATTENDANCE.length + 1,
      staff_id,
      staff_name: updates.staff_name || `Staff #${staff_id}`,
      employee_id: updates.employee_id || `EMP-${staff_id}`,
      role: updates.role || "Staff",
      date,
      status: updates.status || "Present",
      total_hours: updates.total_hours || 8.0,
      ...updates
    };
    INITIAL_ATTENDANCE.push(record);
  } else {
    Object.assign(record, updates);
  }
  return record;
}

export function disburseStaffSalary(
  payroll_id: number,
  payment_mode: 'Bank Transfer' | 'UPI' | 'Cash',
  transaction_ref?: string
): PayrollRecord | undefined {
  const item = INITIAL_PAYROLL.find(p => p.id === payroll_id);
  if (item) {
    item.payment_status = 'Paid';
    item.payment_mode = payment_mode;
    item.paid_at = new Date().toISOString();
    item.transaction_ref = transaction_ref || `PAY-${payment_mode.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    return item;
  }
  return undefined;
}
