// ─────────────────────────────────────────────────────────────────────────────
// HOTEL BLUE BIRD INN - LIVE OPERATIONS & TIME SLA STORE
// Real-time tracking of tasks across Housekeeping, Maintenance, Kitchen, Runner, & Front Desk
// ─────────────────────────────────────────────────────────────────────────────

export type TaskDepartment = 'Housekeeping' | 'Maintenance' | 'Kitchen' | 'Runner' | 'FrontDesk';
export type TaskPriority = 'Normal' | 'High' | 'Emergency';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Escalated';
export type TaskSLAHealth = 'ON_TIME' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';

export interface LiveHotelTask {
  id: string;
  department: TaskDepartment;
  task_type: string;
  title: string;
  room_number: string;
  assigned_to: string;
  staff_role: string;
  priority: TaskPriority;
  status: TaskStatus;
  standard_sla_minutes: number; // Target SLA completion window
  started_at: string;           // ISO timestamp
  completed_at?: string | null;
  notes?: string;
  escalated: boolean;
  escalated_at?: string | null;
  escalated_by?: string | null;
}

export interface ComputedLiveTask extends LiveHotelTask {
  elapsed_minutes: number;
  remaining_minutes: number;
  sla_progress_percent: number;
  sla_status: TaskSLAHealth;
}

// Generate sensible timestamps relative to current time so demo / live data always has realistic countdowns
const now = Date.now();
const minutesAgo = (mins: number) => new Date(now - mins * 60 * 1000).toISOString();

export let LIVE_TASKS: LiveHotelTask[] = [
  {
    id: "TSK-MNT-102",
    department: "Maintenance",
    task_type: "HVAC & Cooling",
    title: "AC Compressor Coil & Thermostat Calibration",
    room_number: "102",
    assigned_to: "Ramesh Kumar (Chief Tech)",
    staff_role: "Chief Engineer",
    priority: "High",
    status: "In Progress",
    standard_sla_minutes: 30,
    started_at: minutesAgo(38), // 38 mins ago -> 8 mins overdue!
    notes: "Guest reported lukewarm airflow. Technician diagnosing refrigerant valve.",
    escalated: true,
    escalated_at: minutesAgo(5),
    escalated_by: "General Manager"
  },
  {
    id: "TSK-KIT-204",
    department: "Kitchen",
    task_type: "Hot Kitchen Prep",
    title: "Andaman Fresh Catch Fish Curry & Tandoori Roti",
    room_number: "204",
    assigned_to: "Executive Chef Ranveer Brar",
    staff_role: "Head Chef",
    priority: "Normal",
    status: "In Progress",
    standard_sla_minutes: 20,
    started_at: minutesAgo(16), // 16 mins ago -> Due soon (4 mins remaining)
    notes: "Simmering fish curry reduction; plating for runner collection.",
    escalated: false
  },
  {
    id: "TSK-RUN-204",
    department: "Runner",
    task_type: "F&B Suite Delivery",
    title: "Room Service Tray Delivery - Suite 204",
    room_number: "204",
    assigned_to: "Runner Vikram Rathore",
    staff_role: "F&B Runner",
    priority: "Normal",
    status: "Pending",
    standard_sla_minutes: 10,
    started_at: minutesAgo(2),
    notes: "Staged at Kitchen Pass counter waiting for Chef handoff.",
    escalated: false
  },
  {
    id: "TSK-HSK-201",
    department: "Housekeeping",
    task_type: "Turnover Cleaning",
    title: "Full Suite Turnover & UV Sanitization",
    room_number: "201",
    assigned_to: "Sunita Rawat",
    staff_role: "Housekeeper",
    priority: "Normal",
    status: "In Progress",
    standard_sla_minutes: 25,
    started_at: minutesAgo(14), // 14 mins elapsed of 25m SLA
    notes: "Bed linen refreshed with island sheets. Scrubbing master bathroom.",
    escalated: false
  },
  {
    id: "TSK-HSK-305",
    department: "Housekeeping",
    task_type: "Linen & Supplies",
    title: "Extra Egyptian Cotton Towels & Bath Kit",
    room_number: "305",
    assigned_to: "Sunita Rawat",
    staff_role: "Housekeeper",
    priority: "Normal",
    status: "In Progress",
    standard_sla_minutes: 15,
    started_at: minutesAgo(6),
    notes: "Guest requested 2 extra bath sheets and organic bath amenities.",
    escalated: false
  },
  {
    id: "TSK-REC-105",
    department: "FrontDesk",
    task_type: "Bell Desk Luggage",
    title: "VIP Express Luggage Escort & Island Welcome Drink",
    room_number: "105",
    assigned_to: "Aarav Sharma",
    staff_role: "Front Desk Host",
    priority: "High",
    status: "In Progress",
    standard_sla_minutes: 12,
    started_at: minutesAgo(5),
    notes: "Guest checked in from Port Blair ferry. 3 bags in transit via service trolley.",
    escalated: false
  },
  {
    id: "TSK-MNT-202",
    department: "Maintenance",
    task_type: "Plumbing / Hardware",
    title: "Balcony Sliding Door Latch & Rain Drain Inspection",
    room_number: "202",
    assigned_to: "Ramesh Kumar (Chief Tech)",
    staff_role: "Chief Engineer",
    priority: "Normal",
    status: "Completed",
    standard_sla_minutes: 20,
    started_at: minutesAgo(35),
    completed_at: minutesAgo(8),
    notes: "Lubricated track and tightened child safety lock.",
    escalated: false
  }
];

export function computeTaskSLA(task: LiveHotelTask, referenceTime = Date.now()): ComputedLiveTask {
  const startedTime = new Date(task.started_at).getTime();
  const endTime = task.completed_at ? new Date(task.completed_at).getTime() : referenceTime;
  const diffMinutes = Math.max(0, Math.floor((endTime - startedTime) / (60 * 1000)));

  const remaining = task.standard_sla_minutes - diffMinutes;
  const progressPercent = Math.min(100, Math.round((diffMinutes / Math.max(1, task.standard_sla_minutes)) * 100));

  let slaHealth: TaskSLAHealth = 'ON_TIME';
  if (task.status === 'Completed') {
    slaHealth = 'COMPLETED';
  } else if (diffMinutes > task.standard_sla_minutes) {
    slaHealth = 'OVERDUE';
  } else if (remaining <= 5 || progressPercent >= 75) {
    slaHealth = 'DUE_SOON';
  } else {
    slaHealth = 'ON_TIME';
  }

  return {
    ...task,
    elapsed_minutes: diffMinutes,
    remaining_minutes: remaining,
    sla_progress_percent: progressPercent,
    sla_status: slaHealth
  };
}

export function getAllLiveTasks(departmentFilter?: string, statusFilter?: string): ComputedLiveTask[] {
  let list = LIVE_TASKS;

  if (departmentFilter && departmentFilter !== 'All') {
    list = list.filter(t => t.department === departmentFilter);
  }

  if (statusFilter && statusFilter !== 'All') {
    if (statusFilter === 'Active') {
      list = list.filter(t => t.status !== 'Completed');
    } else if (statusFilter === 'Overdue') {
      const nowTs = Date.now();
      list = list.filter(t => t.status !== 'Completed' && computeTaskSLA(t, nowTs).sla_status === 'OVERDUE');
    } else if (statusFilter === 'Completed') {
      list = list.filter(t => t.status === 'Completed');
    }
  }

  // Compute live SLA for each
  const nowTs = Date.now();
  return list.map(t => computeTaskSLA(t, nowTs));
}

export function escalateTask(taskId: string, managerNote?: string): ComputedLiveTask | null {
  const index = LIVE_TASKS.findIndex(t => t.id === taskId);
  if (index === -1) return null;

  LIVE_TASKS[index] = {
    ...LIVE_TASKS[index],
    priority: 'High',
    escalated: true,
    escalated_at: new Date().toISOString(),
    escalated_by: "General Manager",
    notes: managerNote ? `${LIVE_TASKS[index].notes || ''} [GM ESCALATION: ${managerNote}]`.trim() : LIVE_TASKS[index].notes
  };

  return computeTaskSLA(LIVE_TASKS[index]);
}

export function completeTask(taskId: string): ComputedLiveTask | null {
  const index = LIVE_TASKS.findIndex(t => t.id === taskId);
  if (index === -1) return null;

  LIVE_TASKS[index] = {
    ...LIVE_TASKS[index],
    status: 'Completed',
    completed_at: new Date().toISOString()
  };

  return computeTaskSLA(LIVE_TASKS[index]);
}

export function createNewLiveTask(newTask: Partial<LiveHotelTask> & {
  title: string;
  department: TaskDepartment;
  room_number: string;
  assigned_to: string;
  standard_sla_minutes: number;
}): ComputedLiveTask {
  const id = `TSK-${newTask.department.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const created: LiveHotelTask = {
    id,
    department: newTask.department,
    task_type: newTask.task_type || "Service Request",
    title: newTask.title,
    room_number: newTask.room_number,
    assigned_to: newTask.assigned_to,
    staff_role: newTask.staff_role || `${newTask.department} Staff`,
    priority: newTask.priority || 'Normal',
    status: newTask.status || 'In Progress',
    standard_sla_minutes: Number(newTask.standard_sla_minutes) || 20,
    started_at: new Date().toISOString(),
    notes: newTask.notes || "Dispatched by General Manager",
    escalated: false
  };

  LIVE_TASKS.unshift(created);
  return computeTaskSLA(created);
}
