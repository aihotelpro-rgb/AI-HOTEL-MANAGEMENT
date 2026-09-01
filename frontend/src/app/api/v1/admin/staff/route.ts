import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const STAFF_LIST = [
  {
    id: 1,
    username: "admin",
    role: "Admin",
    full_name: "Maharani Gayatri Devi",
    employee_id: "EMP-0001",
    phone: "+91 98111 00001",
    email: "admin@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    shift: "General Management (09:00 - 18:00)",
    emergency_contact: "+91 98111 99999"
  },
  {
    id: 2,
    username: "reception",
    role: "Reception",
    full_name: "Aarav Sharma",
    employee_id: "EMP-1021",
    phone: "+91 98222 00002",
    email: "frontdesk@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    shift: "Morning Shift (07:00 - 15:30)",
    emergency_contact: "+91 98222 99999"
  },
  {
    id: 3,
    username: "kitchen",
    role: "Kitchen",
    full_name: "Executive Chef Ranveer Brar",
    employee_id: "EMP-2045",
    phone: "+91 98333 00003",
    email: "kitchen@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150",
    shift: "All-Day Dining (11:00 - 23:00)",
    emergency_contact: "+91 98333 99999"
  },
  {
    id: 4,
    username: "runner_vikram",
    role: "Runner",
    full_name: "Runner Vikram Rathore",
    employee_id: "RUN-401",
    phone: "+91 98777 00401",
    email: "vikram.runner@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    shift: "Morning Dining Shift (07:00 - 15:30)",
    emergency_contact: "+91 98777 99991"
  },
  {
    id: 5,
    username: "runner_amit",
    role: "Runner",
    full_name: "Runner Amit Verma",
    employee_id: "RUN-402",
    phone: "+91 98777 00402",
    email: "amit.runner@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    shift: "Evening Dining Shift (15:00 - 23:30)",
    emergency_contact: "+91 98777 99992"
  },
  {
    id: 6,
    username: "runner_priya",
    role: "Runner",
    full_name: "Runner Priya Sundaram",
    employee_id: "RUN-403",
    phone: "+91 98777 00403",
    email: "priya.runner@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    shift: "VIP Concierge Shift (10:00 - 18:30)",
    emergency_contact: "+91 98777 99993"
  },
  {
    id: 7,
    username: "butler_rahul",
    role: "Butler",
    full_name: "Executive Butler Rahul Kapoor",
    employee_id: "BTL-501",
    phone: "+91 98888 00501",
    email: "rahul.butler@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    shift: "Penthouse Duty (24/7 On-Call)",
    emergency_contact: "+91 98888 99991"
  },
  {
    id: 8,
    username: "tech_ramesh",
    role: "Maintenance",
    full_name: "Ramesh Kumar (Chief Tech)",
    employee_id: "ENG-601",
    phone: "+91 98999 00601",
    email: "engineering@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
    shift: "General Engineering (08:00 - 17:00)",
    emergency_contact: "+91 98999 99991"
  },
  {
    id: 9,
    username: "housekeeping",
    role: "Housekeeping",
    full_name: "Sunita Rawat",
    employee_id: "EMP-3012",
    phone: "+91 98444 00004",
    email: "housekeeping@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    shift: "Morning Shift (07:00 - 15:30)",
    emergency_contact: "+91 98444 99999"
  },
  {
    id: 10,
    username: "manager",
    role: "Executive",
    full_name: "Vikramaditya Rathore",
    employee_id: "EMP-0010",
    phone: "+91 98555 00005",
    email: "gm@grandpalace.in",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    shift: "Executive Stand-Up (07:30 - 19:30)",
    emergency_contact: "+91 98555 99999"
  }
];

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(STAFF_LIST, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newStaff = {
      id: STAFF_LIST.length + 1,
      username: body.username || `staff_${STAFF_LIST.length + 1}`,
      role: body.role || "Runner",
      full_name: body.full_name || "New Staff Member",
      employee_id: body.employee_id || `EMP-${1000 + STAFF_LIST.length + 1}`,
      phone: body.phone || "+91 98000 00000",
      email: body.email || "staff@grandpalace.in",
      avatar_url: body.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      shift: body.shift || "Morning Shift (07:00 - 15:30)",
      emergency_contact: body.phone || "+91 98000 99999"
    };

    STAFF_LIST.push(newStaff);
    return NextResponse.json(newStaff, { status: 201, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create staff HR profile" }, { status: 400, headers: corsHeaders });
  }
}
