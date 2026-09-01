export interface HousekeepingTicket {
  id: number;
  booking_id: number;
  room_number: string;
  category: string; // Housekeeping, Maintenance, Amenity
  description: string;
  status: string; // Pending, In Progress, Cleaned
  priority: string; // Low, Medium, High, Emergency
  assigned_to?: string;
  created_at: string;
  resolved_at?: string | null;
}

export let HOUSEKEEPING_TICKETS: HousekeepingTicket[] = [
  {
    id: 1,
    booking_id: 101,
    room_number: "101",
    category: "Maintenance",
    description: "Bathroom rainfall showerhead pressure low. Needs technician inspection.",
    status: "Pending",
    priority: "High",
    assigned_to: "Tech Ramesh",
    created_at: new Date(Date.now() - 35 * 60000).toISOString()
  },
  {
    id: 2,
    booking_id: 104,
    room_number: "204",
    category: "Amenity",
    description: "Guest requested extra plush Egyptian cotton bath sheets & lavender aromatics.",
    status: "In Progress",
    priority: "Medium",
    assigned_to: "Attendant Sunita",
    created_at: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: 3,
    booking_id: 108,
    room_number: "302",
    category: "Housekeeping",
    description: "Complete room turnover & minibar restocking after early guest departure.",
    status: "Pending",
    priority: "High",
    assigned_to: "Attendant Rahul",
    created_at: new Date(Date.now() - 50 * 60000).toISOString()
  }
];

export function updateTicketStatusInStore(ticketId: number, status: string, assignedTo?: string): HousekeepingTicket | null {
  const ticket = HOUSEKEEPING_TICKETS.find(t => t.id === ticketId);
  if (!ticket) return null;

  ticket.status = status;
  if (assignedTo) ticket.assigned_to = assignedTo;
  if (status === 'Cleaned' || status === 'Resolved') {
    ticket.resolved_at = new Date().toISOString();
  }
  return ticket;
}
