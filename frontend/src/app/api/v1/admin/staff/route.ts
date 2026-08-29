import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
    id: 5,
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
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  return NextResponse.json(STAFF_LIST, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
