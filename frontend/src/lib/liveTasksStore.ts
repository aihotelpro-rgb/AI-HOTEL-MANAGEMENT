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

// ─────────────────────────────────────────────────────────────────────────────
// SAVED TASK SLA TEMPLATES MASTER CATALOG
// Standard Operating Procedures (SOP) with GM & Admin Editable Standard SLA Times
// ─────────────────────────────────────────────────────────────────────────────

export interface SavedTaskTemplate {
  id: string;
  department: TaskDepartment;
  task_type: string;
  title: string;
  default_sla_minutes: number;
  default_role: string;
  default_staff: string;
  priority: TaskPriority;
  checklist?: string[];
  description?: string;
  icon?: string;
}

export let SAVED_TASK_TEMPLATES: SavedTaskTemplate[] = [
  // HOUSEKEEPING
  {
    id: "TPL-HSK-TURNOVER",
    department: "Housekeeping",
    task_type: "Turnover Cleaning",
    title: "Full Room Checkout Turnover Cleaning & UV Sanitization",
    default_sla_minutes: 30,
    default_role: "Housekeeper",
    default_staff: "Sunita Rawat",
    priority: "Normal",
    checklist: [
      "Strip & replace bed linen with fresh Andaman cotton sheets",
      "Sanitize master bath, glass screens & replenish toiletries",
      "Vacuum rug, mop Italian marble floor & dust furniture",
      "Restock complimentary minibar & fresh water carafes",
      "Activate UV-C sanitization wand & inspect with blacklight"
    ],
    description: "Standard checkout room cleaning procedure before new guest check-in.",
    icon: "🧹"
  },
  {
    id: "TPL-HSK-REFRESH",
    department: "Housekeeping",
    task_type: "Daily Refresh",
    title: "Daily Stayover Linen & Suite Refresh",
    default_sla_minutes: 18,
    default_role: "Housekeeper",
    default_staff: "Sunita Rawat",
    priority: "Normal",
    checklist: [
      "Make bed & tidy pillows",
      "Empty trash bins & replace liners",
      "Replace used towels & replenish amenities",
      "Quick wipe bath counter & vacuum high-traffic area"
    ],
    description: "Mid-stay refresh for continuing guests.",
    icon: "✨"
  },
  {
    id: "TPL-HSK-TURNDOWN",
    department: "Housekeeping",
    task_type: "Evening Turndown",
    title: "Evening Turndown & Aromatherapy Service",
    default_sla_minutes: 12,
    default_role: "Housekeeper",
    default_staff: "Sunita Rawat",
    priority: "Normal",
    checklist: [
      "Turn down bed duvet at 45-degree angle",
      "Place bedside water, slippers & sleep chocolates",
      "Draw blackout curtains & set ambient lighting",
      "Diffuse island lemongrass aromatherapy essence"
    ],
    description: "Signature 5-star evening turndown ritual (6:00 PM - 8:30 PM).",
    icon: "🌙"
  },
  {
    id: "TPL-HSK-TOWELS",
    department: "Housekeeping",
    task_type: "Guest Request",
    title: "Extra Towel, Linen & Bath Amenities Delivery",
    default_sla_minutes: 8,
    default_role: "Housekeeper",
    default_staff: "Sunita Rawat",
    priority: "High",
    checklist: [
      "Pack 2 Egyptian cotton bath towels, bathrobes & slippers",
      "Verify room number & hand over with warm greeting"
    ],
    description: "Rapid delivery of fresh linens or bathroom requisites.",
    icon: "🧺"
  },
  {
    id: "TPL-HSK-DEEP",
    department: "Housekeeping",
    task_type: "Deep Sanitization",
    title: "Deep Steam Sanitization & Carpet Treatment",
    default_sla_minutes: 45,
    default_role: "Housekeeper",
    default_staff: "Sunita Rawat",
    priority: "Normal",
    checklist: [
      "Deep steam upholstery & curtains",
      "Heavy scrub tile grouting & balcony glass",
      "Air purifier ozone cycle & allergen neutralization"
    ],
    description: "Comprehensive periodic deep cleaning.",
    icon: "🧼"
  },

  // RUNNER / ROOM SERVICE DELIVERY
  {
    id: "TPL-RUN-DELIVERY",
    department: "Runner",
    task_type: "F&B Suite Delivery",
    title: "Attending Room Service Delivery & Island Table Set",
    default_sla_minutes: 10,
    default_role: "F&B Runner",
    default_staff: "Runner Vikram Rathore",
    priority: "High",
    checklist: [
      "Inspect hot cloche dome & cold beverage temperature",
      "Escort insulated dining trolley to guest suite",
      "Knock gently & announce 'Room Service with your compliments'",
      "Present dishes, offer to uncork beverages & set dining table",
      "Explain tray clearance procedure & wish pleasant dining"
    ],
    description: "Prompt delivery of gourmet meals and beverages directly to guest room.",
    icon: "🍽️"
  },
  {
    id: "TPL-RUN-CLEARANCE",
    department: "Runner",
    task_type: "Tray Clearance",
    title: "Soiled Dish & Dining Tray Clearance from Suite",
    default_sla_minutes: 10,
    default_role: "F&B Runner",
    default_staff: "Runner Vikram Rathore",
    priority: "Normal",
    checklist: [
      "Collect used trays, cutlery and glassware from room or hallway",
      "Wipe down corridor credenza if tray was left outside",
      "Transfer soiled items directly to Stewarding Dish Pit"
    ],
    description: "Clearance of post-meal trays to maintain pristine guest corridors.",
    icon: "🛎️"
  },

  // KITCHEN
  {
    id: "TPL-KIT-EXPRESS",
    department: "Kitchen",
    task_type: "Kitchen Express",
    title: "Express Breakfast & Hot Beverage Pass Prep",
    default_sla_minutes: 15,
    default_role: "Head Chef",
    default_staff: "Executive Chef Ranveer Brar",
    priority: "High",
    checklist: [
      "Fire skillet order (eggs, pancakes or South Indian platter)",
      "Brew artisan French press or masala chai",
      "Garnish, plate and stage at runner pickup pass"
    ],
    description: "Speedy preparation for early morning breakfasts and quick bites.",
    icon: "🍳"
  },
  {
    id: "TPL-KIT-GOURMET",
    department: "Kitchen",
    task_type: "Gourmet Dining",
    title: "Chef Andaman Seafood Dinner Course Preparation",
    default_sla_minutes: 25,
    default_role: "Head Chef",
    default_staff: "Executive Chef Ranveer Brar",
    priority: "Normal",
    checklist: [
      "Grill fresh reef catch with island herb glaze",
      "Prepare coconut rice reduction & charcoal-baked bread",
      "Plate on heated porcelain cloches and notify runner"
    ],
    description: "Signature culinary creations and multi-course guest in-room dining.",
    icon: "🦀"
  },

  // MAINTENANCE & ENGINEERING
  {
    id: "TPL-MNT-AC",
    department: "Maintenance",
    task_type: "HVAC & Cooling",
    title: "AC Compressor, Cooling Coil & Thermostat Diagnostic",
    default_sla_minutes: 30,
    default_role: "Chief Engineer",
    default_staff: "Ramesh Kumar (Chief Tech)",
    priority: "High",
    checklist: [
      "Check airflow temperature with laser digital probe",
      "Inspect filter cleanliness & clean coil if dusty",
      "Calibrate digital wall thermostat sensor",
      "Verify quiet compressor cycle below 35dB"
    ],
    description: "Fast resolution of room climate control & cooling requests.",
    icon: "❄️"
  },
  {
    id: "TPL-MNT-PLUMB",
    department: "Maintenance",
    task_type: "Plumbing",
    title: "Shower Pressure, Hot Water Mixer & Drain Clearance",
    default_sla_minutes: 20,
    default_role: "Chief Engineer",
    default_staff: "Ramesh Kumar (Chief Tech)",
    priority: "High",
    checklist: [
      "Check booster pump pressure at shower head",
      "Test hot water temperature (target 40-42°C in 15 seconds)",
      "Clear hairline drain traps & check seal integrity"
    ],
    description: "Bathroom water pressure, geyser and drain diagnostics.",
    icon: "🚿"
  },
  {
    id: "TPL-MNT-ELECT",
    department: "Maintenance",
    task_type: "Electrical & AV",
    title: "Smart TV, High-Speed Wi-Fi AP & Intercom Diagnostic",
    default_sla_minutes: 15,
    default_role: "Chief Engineer",
    default_staff: "Ramesh Kumar (Chief Tech)",
    priority: "Normal",
    checklist: [
      "Verify HDMI/OTT streaming cast connectivity",
      "Ping suite in-room Wi-Fi access point",
      "Test bedside intercom dial tone"
    ],
    description: "In-room electronics, entertainment and connectivity assistance.",
    icon: "📺"
  },
  {
    id: "TPL-MNT-LOCK",
    department: "Maintenance",
    task_type: "Locksmith & Security",
    title: "RFID Smart Door Lock Sensor & Battery Replacement",
    default_sla_minutes: 12,
    default_role: "Chief Engineer",
    default_staff: "Ramesh Kumar (Chief Tech)",
    priority: "High",
    checklist: [
      "Scan diagnostic master key to read low battery alert",
      "Replace 4x AA lithium cells with fresh pack",
      "Reprogram lock reader and verify test keycard opening"
    ],
    description: "Rapid RFID suite access resolution for locked-out or blinking doors.",
    icon: "🔑"
  },

  // FRONT DESK & CONCIERGE
  {
    id: "TPL-REC-LUGGAGE",
    department: "FrontDesk",
    task_type: "Luggage Assistance",
    title: "Arrival Welcome & Bellhop Suite Luggage Escort",
    default_sla_minutes: 10,
    default_role: "Concierge / Bellhop",
    default_staff: "Priya Sharma",
    priority: "Normal",
    checklist: [
      "Tag luggage with room number at reception",
      "Load onto polished brass bellman cart",
      "Escort guest to suite, demonstrate room switches and safe"
    ],
    description: "Seamless guest arrival luggage escort.",
    icon: "🧳"
  },
  {
    id: "TPL-REC-EXPRESS_CO",
    department: "FrontDesk",
    task_type: "Luggage Pickup",
    title: "Departure Express Luggage Pickup for Ferry/Flight",
    default_sla_minutes: 10,
    default_role: "Concierge / Bellhop",
    default_staff: "Priya Sharma",
    priority: "High",
    checklist: [
      "Arrive at suite with bell trolley at requested departure time",
      "Count bags with guest & confirm vehicle/ferry timing",
      "Transfer to lobby concierge departure holding area"
    ],
    description: "Punctual luggage retrieval for departing guests.",
    icon: "🚕"
  },
  {
    id: "TPL-REC-FERRY",
    department: "FrontDesk",
    task_type: "Transport",
    title: "Private Speedboat & Island Ferry Transfer Coordination",
    default_sla_minutes: 15,
    default_role: "Concierge / Bellhop",
    default_staff: "Priya Sharma",
    priority: "Normal",
    checklist: [
      "Confirm guest ferry tickets with Makruzz / Nautika operator",
      "Coordinate hotel private AC shuttle dispatch to Jetty",
      "Hand guest boarding passes & chilled coconut water"
    ],
    description: "Arranging inter-island transit and private pier transfers.",
    icon: "🚤"
  }
];

export function getSavedTaskTemplates(department?: TaskDepartment): SavedTaskTemplate[] {
  if (department) {
    return SAVED_TASK_TEMPLATES.filter(t => t.department === department);
  }
  return SAVED_TASK_TEMPLATES;
}

export function updateSavedTaskTemplate(id: string, updates: Partial<SavedTaskTemplate>): SavedTaskTemplate | null {
  const index = SAVED_TASK_TEMPLATES.findIndex(t => t.id === id);
  if (index === -1) return null;

  SAVED_TASK_TEMPLATES[index] = {
    ...SAVED_TASK_TEMPLATES[index],
    ...updates
  };
  return SAVED_TASK_TEMPLATES[index];
}

export function createBatchLiveTasks(params: {
  templateId?: string;
  department: TaskDepartment;
  title: string;
  room_numbers: string[];
  assigned_to: string;
  staff_role?: string;
  priority?: TaskPriority;
  standard_sla_minutes: number;
  notes?: string;
}): ComputedLiveTask[] {
  const createdList: ComputedLiveTask[] = [];

  for (const rm of params.room_numbers) {
    const trimmed = rm.trim();
    if (!trimmed) continue;

    const newTask = createNewLiveTask({
      department: params.department,
      task_type: params.title.split(' ')[0] || "SOP Task",
      title: params.title,
      room_number: trimmed,
      assigned_to: params.assigned_to,
      staff_role: params.staff_role || `${params.department} Staff`,
      priority: params.priority || 'Normal',
      status: 'In Progress',
      standard_sla_minutes: Number(params.standard_sla_minutes) || 20,
      notes: params.notes || `Dispatched via SOP Template (${params.standard_sla_minutes}m SLA)`
    });

    createdList.push(newTask);
  }

  return createdList;
}

