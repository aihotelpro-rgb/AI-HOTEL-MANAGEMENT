// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE IN-MEMORY INTERCOM SIGNALING STORE
// Global singleton that persists during the Vercel serverless warm window.
// Acts as the bidirectional signaling layer between room and reception browsers.
//
// TWO QUEUES:
//   __intercomCallQueue      → Guest room → Reception  (room calls desk)
//   __intercomRoomCallQueue  → Reception  → Guest room (desk calls room)
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __intercomCallQueue: IntercomCall[];       // room → reception
  // eslint-disable-next-line no-var
  var __intercomRoomCallQueue: IntercomCall[];   // reception → room
  // eslint-disable-next-line no-var
  var __intercomCallHistory: IntercomCall[];
}

export interface IntercomCall {
  call_id: string;
  from_room: string;
  caller_name: string;
  from_extension: string;
  target_extension: string;
  status: 'ringing' | 'active' | 'completed' | 'missed' | 'declined';
  started_at: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  hotel: string;
}

// ── Initialize stores once ──────────────────────────────────────────────────
if (!global.__intercomCallQueue) {
  global.__intercomCallQueue = [];
}
if (!global.__intercomRoomCallQueue) {
  global.__intercomRoomCallQueue = [];
}
if (!global.__intercomCallHistory) {
  global.__intercomCallHistory = [
    {
      call_id: 'voip_demo_001',
      from_room: '204',
      caller_name: 'Room 204 Guest',
      from_extension: '204',
      target_extension: '100',
      status: 'completed',
      started_at: new Date(Date.now() - 7200000).toISOString(),
      ended_at: new Date(Date.now() - 7116000).toISOString(),
      duration_seconds: 84,
      hotel: 'Hotel Blue Bird Inn',
    },
    {
      call_id: 'voip_demo_002',
      from_room: '101',
      caller_name: 'Room 101 Guest',
      from_extension: '101',
      target_extension: '100',
      status: 'missed',
      started_at: new Date(Date.now() - 3600000).toISOString(),
      ended_at: new Date(Date.now() - 3570000).toISOString(),
      duration_seconds: 0,
      hotel: 'Hotel Blue Bird Inn',
    },
  ];
}

// ── Getters ─────────────────────────────────────────────────────────────────
export function getCallQueue() { return global.__intercomCallQueue; }
export function getRoomCallQueue() { return global.__intercomRoomCallQueue; }
export function getCallHistory() { return global.__intercomCallHistory; }

// ── Room→Reception: add to inbound queue ────────────────────────────────────
export function addCallToQueue(call: IntercomCall) {
  // Remove any existing ringing call from same room (prevent duplicates)
  global.__intercomCallQueue = global.__intercomCallQueue.filter(
    (c) => !(c.from_room === call.from_room && c.status === 'ringing')
  );
  global.__intercomCallQueue.push(call);
}

// ── Reception→Room: add to per-room incoming queue ──────────────────────────
export function addRoomIncomingCall(call: IntercomCall) {
  // Remove existing ringing call to same target room (dedup)
  global.__intercomRoomCallQueue = global.__intercomRoomCallQueue.filter(
    (c) => !(c.target_extension === call.target_extension && c.status === 'ringing')
  );
  global.__intercomRoomCallQueue.push(call);
}

// ── Get ringing incoming calls for a specific room ──────────────────────────
export function getRoomIncomingCalls(roomNumber: string): IntercomCall[] {
  expireRoomCalls();
  return global.__intercomRoomCallQueue.filter(
    (c) => c.target_extension === roomNumber && c.status === 'ringing'
  );
}

// ── Update status in either queue ───────────────────────────────────────────
export function updateCallStatus(
  call_id: string,
  status: IntercomCall['status'],
  extra?: Partial<IntercomCall>
) {
  // Check inbound queue first
  let idx = global.__intercomCallQueue.findIndex((c) => c.call_id === call_id);
  if (idx !== -1) {
    global.__intercomCallQueue[idx] = { ...global.__intercomCallQueue[idx], status, ...extra };
    if (['completed', 'missed', 'declined'].includes(status)) {
      const finished = global.__intercomCallQueue.splice(idx, 1)[0];
      _pushToHistory(finished);
    }
    return true;
  }
  // Check room-incoming (outbound) queue
  idx = global.__intercomRoomCallQueue.findIndex((c) => c.call_id === call_id);
  if (idx !== -1) {
    global.__intercomRoomCallQueue[idx] = { ...global.__intercomRoomCallQueue[idx], status, ...extra };
    if (['completed', 'missed', 'declined'].includes(status)) {
      const finished = global.__intercomRoomCallQueue.splice(idx, 1)[0];
      _pushToHistory(finished);
    }
    return true;
  }
  return false;
}

function _pushToHistory(call: IntercomCall) {
  global.__intercomCallHistory.unshift(call);
  if (global.__intercomCallHistory.length > 50) {
    global.__intercomCallHistory = global.__intercomCallHistory.slice(0, 50);
  }
}

// ── Auto-expire ringing calls after 45 seconds ─────────────────────────────
export function expireRingingCalls() {
  const now = Date.now();
  global.__intercomCallQueue
    .filter((c) => c.status === 'ringing' && now - new Date(c.started_at).getTime() > 45000)
    .forEach((c) =>
      updateCallStatus(c.call_id, 'missed', { ended_at: new Date().toISOString(), duration_seconds: 0 })
    );
}

export function expireRoomCalls() {
  const now = Date.now();
  global.__intercomRoomCallQueue
    .filter((c) => c.status === 'ringing' && now - new Date(c.started_at).getTime() > 45000)
    .forEach((c) =>
      updateCallStatus(c.call_id, 'missed', { ended_at: new Date().toISOString(), duration_seconds: 0 })
    );
}
