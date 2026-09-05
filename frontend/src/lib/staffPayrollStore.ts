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

const todayDateObj = new Date();
const currentYear = todayDateObj.getFullYear();
const currentMonth = String(todayDateObj.getMonth() + 1).padStart(2, '0');
const todayStr = todayDateObj.toISOString().split('T')[0];

const staffProfiles = [
  { staff_id: 1, staff_name: "Maharani Gayatri Devi", employee_id: "EMP-0001", role: "Admin", shift: "09:00 - 18:00" },
  { staff_id: 2, staff_name: "Aarav Sharma", employee_id: "EMP-1021", role: "Reception", shift: "07:00 - 15:30" },
  { staff_id: 3, staff_name: "Executive Chef Ranveer Brar", employee_id: "EMP-2045", role: "Kitchen", shift: "11:00 - 23:00" },
  { staff_id: 4, staff_name: "Runner Vikram Rathore", employee_id: "RUN-401", role: "Runner", shift: "07:00 - 15:30" },
  { staff_id: 5, staff_name: "Runner Amit Verma", employee_id: "RUN-402", role: "Runner", shift: "15:00 - 23:30" },
  { staff_id: 6, staff_name: "Runner Priya Sundaram", employee_id: "RUN-403", role: "Runner", shift: "10:00 - 18:30" },
  { staff_id: 7, staff_name: "Executive Butler Rahul Kapoor", employee_id: "BTL-501", role: "Butler", shift: "08:00 - 20:00" },
  { staff_id: 8, staff_name: "Ramesh Kumar (Chief Tech)", employee_id: "ENG-601", role: "Maintenance", shift: "08:30 - 17:15" },
  { staff_id: 9, staff_name: "Sunita Rawat", employee_id: "EMP-3012", role: "Housekeeping", shift: "07:00 - 15:30" },
  { staff_id: 10, staff_name: "Vikramaditya Rathore", employee_id: "EMP-0010", role: "Executive", shift: "08:00 - 19:30" }
];

function generateSeededMonthlyAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  let idCounter = 1;

  // Days 1 through 5 of current month
  for (let d = 1; d <= 5; d++) {
    const dayStr = `${currentYear}-${currentMonth}-${String(d).padStart(2, '0')}`;
    staffProfiles.forEach(staff => {
      let status: 'Present' | 'Late' | 'HalfDay' | 'Absent' | 'OnLeave' = 'Present';
      let clockIn = "08:00 AM";
      let clockOut = "05:00 PM";
      let hours = 9.0;

      // Realistic variations for demo
      if (staff.staff_id === 5 && d === 3) {
        status = 'Late';
        clockIn = "03:45 PM";
        clockOut = "11:30 PM";
        hours = 7.75;
      } else if (staff.staff_id === 2 && d === 2) {
        status = 'HalfDay';
        clockIn = "07:00 AM";
        clockOut = "11:30 AM";
        hours = 4.5;
      } else if (staff.staff_id === 9 && d === 4) {
        status = 'OnLeave';
        clockIn = "--";
        clockOut = "--";
        hours = 0;
      } else if (staff.staff_id === 6 && d === 1) {
        status = 'Late';
        clockIn = "10:30 AM";
        clockOut = "06:30 PM";
        hours = 8.0;
      }

      records.push({
        id: idCounter++,
        staff_id: staff.staff_id,
        staff_name: staff.staff_name,
        employee_id: staff.employee_id,
        role: staff.role,
        date: dayStr,
        clock_in: clockIn,
        clock_out: clockOut,
        status,
        total_hours: hours,
        notes: status === 'Late' ? 'Traffic delay reported' : status === 'OnLeave' ? 'Approved leave' : undefined
      });
    });
  }

  return records;
}

export let INITIAL_ATTENDANCE: AttendanceRecord[] = generateSeededMonthlyAttendance();


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

export interface StaffMonthlyRoster {
  staff_id: number;
  staff_name: string;
  employee_id: string;
  role: string;
  shift: string;
  days: Record<number, {
    status: 'Present' | 'Late' | 'HalfDay' | 'Absent' | 'OnLeave';
    clock_in?: string;
    clock_out?: string;
    total_hours: number;
  } | null>;
  total_working_days: number;
  days_present: number;
  days_late: number;
  days_half_day: number;
  days_absent: number;
  days_leave: number;
  overtime_hours: number;
  attendance_percentage: number;
}

export function getMonthlyAttendanceRoster(monthStr: string = '2026-09'): StaffMonthlyRoster[] {
  const parts = monthStr.split('-');
  const year = Number(parts[0]) || 2026;
  const month = Number(parts[1]) || 9;
  const daysInMonth = new Date(year, month, 0).getDate();

  return staffProfiles.map(member => {
    const days: Record<number, any> = {};
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let totalOt = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const rec = INITIAL_ATTENDANCE.find(a => a.staff_id === member.staff_id && a.date === dayStr);

      if (rec) {
        days[day] = {
          status: rec.status,
          clock_in: rec.clock_in,
          clock_out: rec.clock_out,
          total_hours: rec.total_hours
        };
        if (rec.status === 'Present') presentCount++;
        else if (rec.status === 'Late') { presentCount++; lateCount++; }
        else if (rec.status === 'HalfDay') { halfDayCount++; presentCount += 0.5; }
        else if (rec.status === 'Absent') absentCount++;
        else if (rec.status === 'OnLeave') leaveCount++;
        if (rec.total_hours > 8) totalOt += (rec.total_hours - 8);
      } else {
        days[day] = null;
      }
    }

    const recordedDays = Object.values(days).filter(Boolean).length;
    const effectiveDays = Math.max(1, recordedDays);
    const attendancePct = Math.round((presentCount / effectiveDays) * 100);

    return {
      staff_id: member.staff_id,
      staff_name: member.staff_name,
      employee_id: member.employee_id,
      role: member.role,
      shift: member.shift,
      days,
      total_working_days: daysInMonth,
      days_present: presentCount,
      days_late: lateCount,
      days_half_day: halfDayCount,
      days_absent: absentCount,
      days_leave: leaveCount,
      overtime_hours: Math.round(totalOt * 10) / 10,
      attendance_percentage: Math.min(100, attendancePct)
    };
  });
}

export function updateStaffSalaryRecord(
  payroll_id: number,
  updates: Partial<PayrollRecord>
): PayrollRecord | undefined {
  const item = INITIAL_PAYROLL.find(p => p.id === payroll_id || p.staff_id === payroll_id);
  if (!item) return undefined;

  if (updates.base_salary !== undefined) item.base_salary = Number(updates.base_salary);
  if (updates.days_present !== undefined) item.days_present = Number(updates.days_present);
  if (updates.total_working_days !== undefined) item.total_working_days = Number(updates.total_working_days);
  if (updates.overtime_hours !== undefined) item.overtime_hours = Number(updates.overtime_hours);
  
  if (updates.overtime_pay !== undefined) {
    item.overtime_pay = Number(updates.overtime_pay);
  } else if (updates.overtime_hours !== undefined || updates.base_salary !== undefined) {
    const hourlyRate = (item.base_salary / (item.total_working_days * 8)) * 1.5;
    item.overtime_pay = Math.round(item.overtime_hours * hourlyRate);
  }

  if (updates.bonus !== undefined) item.bonus = Number(updates.bonus);
  if (updates.incentives !== undefined) item.incentives = Number(updates.incentives);

  if (updates.pf_deduction !== undefined) {
    item.pf_deduction = Number(updates.pf_deduction);
  } else if (updates.base_salary !== undefined) {
    item.pf_deduction = Math.round(item.base_salary * 0.05);
  }

  if (updates.esi_deduction !== undefined) {
    item.esi_deduction = Number(updates.esi_deduction);
  } else if (updates.base_salary !== undefined) {
    item.esi_deduction = Math.round(item.base_salary * 0.0075);
  }

  if (updates.advance_deduction !== undefined) item.advance_deduction = Number(updates.advance_deduction);
  if (updates.payment_mode !== undefined) item.payment_mode = updates.payment_mode;
  if (updates.payment_status !== undefined) item.payment_status = updates.payment_status;

  // Recalculate Gross Salary and Net Payable
  item.gross_salary = item.base_salary + item.overtime_pay + item.bonus + item.incentives;
  const totalDeductions = item.pf_deduction + item.esi_deduction + item.advance_deduction;
  item.net_payable = Math.max(0, item.gross_salary - totalDeductions);

  return item;
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

