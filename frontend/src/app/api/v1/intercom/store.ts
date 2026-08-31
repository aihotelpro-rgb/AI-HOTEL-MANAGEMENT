// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE IN-MEMORY INTERCOM SIGNALING, WEBRTC & AUDIO RELAY STORE
// Global singleton that persists during the Vercel serverless warm window.
// Acts as the bidirectional signaling layer, TURN/STUN exchange & HTTP audio relay.
// ─────────────────────────────────────────────────────────────────────────────

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

export interface WebRTCSignals {
  offer?: any;
  answer?: any;
  callerCandidates: any[];
  receiverCandidates: any[];
}

export interface AudioChunk {
  id: number;
  sender: 'caller' | 'receiver';
  audio: string; // Base64 encoded audio blob
  timestamp: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __intercomCallQueue: IntercomCall[];       // room → reception
  // eslint-disable-next-line no-var
  var __intercomRoomCallQueue: IntercomCall[];   // reception → room
  // eslint-disable-next-line no-var
  var __intercomCallHistory: IntercomCall[];
  // eslint-disable-next-line no-var
  var __intercomWebRTCSignals: Record<string, WebRTCSignals>;
  // eslint-disable-next-line no-var
  var __intercomAudioRelay: Record<string, AudioChunk[]>;
}

// ── Initialize stores once ──────────────────────────────────────────────────
if (!global.__intercomCallQueue) {
  global.__intercomCallQueue = [];
}
if (!global.__intercomRoomCallQueue) {
  global.__intercomRoomCallQueue = [];
}
if (!global.__intercomWebRTCSignals) {
  global.__intercomWebRTCSignals = {};
}
if (!global.__intercomAudioRelay) {
  global.__intercomAudioRelay = {};
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
      answered_at: new Date(Date.now() - 7199000).toISOString(),
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
  global.__intercomCallQueue = global.__intercomCallQueue.filter(
    (c) => !(c.from_room === call.from_room && c.status === 'ringing')
  );
  global.__intercomCallQueue.push(call);
}

// ── Reception→Room: add to per-room incoming queue ──────────────────────────
export function addRoomIncomingCall(call: IntercomCall) {
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

// ── WebRTC Signaling Exchange ────────────────────────────────────────────────
export function saveWebRTCSignal(
  call_id: string,
  sender: 'caller' | 'receiver',
  type: 'offer' | 'answer' | 'candidate',
  payload: any
) {
  if (!global.__intercomWebRTCSignals[call_id]) {
    global.__intercomWebRTCSignals[call_id] = { callerCandidates: [], receiverCandidates: [] };
  }
  const signals = global.__intercomWebRTCSignals[call_id];

  if (type === 'offer' && sender === 'caller') {
    signals.offer = payload;
  } else if (type === 'answer' && sender === 'receiver') {
    signals.answer = payload;
  } else if (type === 'candidate') {
    if (sender === 'caller') {
      signals.callerCandidates.push(payload);
    } else {
      signals.receiverCandidates.push(payload);
    }
  }
}

export function getWebRTCSignals(call_id: string): WebRTCSignals {
  return global.__intercomWebRTCSignals[call_id] || { callerCandidates: [], receiverCandidates: [] };
}

export function clearWebRTCSignals(call_id: string) {
  delete global.__intercomWebRTCSignals[call_id];
  delete global.__intercomAudioRelay[call_id];
}

// ── HTTP Audio Chunk Relay Store (Cross-ISP Fallback) ──────────────────────
let audioChunkCounter = 1;

export function saveAudioChunk(call_id: string, sender: 'caller' | 'receiver', audioBase64: string) {
  if (!global.__intercomAudioRelay[call_id]) {
    global.__intercomAudioRelay[call_id] = [];
  }
  const chunks = global.__intercomAudioRelay[call_id];
  chunks.push({
    id: audioChunkCounter++,
    sender,
    audio: audioBase64,
    timestamp: new Date().toISOString(),
  });
  // Cap at last 25 audio chunks to keep memory light
  if (chunks.length > 25) {
    global.__intercomAudioRelay[call_id] = chunks.slice(-25);
  }
}

export function getNewAudioChunks(call_id: string, recipientRole: 'caller' | 'receiver', lastChunkId: number): AudioChunk[] {
  const chunks = global.__intercomAudioRelay[call_id] || [];
  const senderTarget = recipientRole === 'caller' ? 'receiver' : 'caller';
  return chunks.filter((c) => c.sender === senderTarget && c.id > lastChunkId);
}

// ── Update status in any queue or history ───────────────────────────────────
export function updateCallStatus(
  call_id: string,
  status: IntercomCall['status'],
  extra?: Partial<IntercomCall>
) {
  const now = new Date().toISOString();

  const processRecord = (item: IntercomCall): IntercomCall => {
    let durSecs = extra?.duration_seconds;
    if (durSecs === undefined || durSecs === null) {
      if (status === 'completed') {
        const start = extra?.answered_at || item.answered_at || item.started_at;
        const startMs = start ? new Date(start).getTime() : Date.now();
        durSecs = Math.max(1, Math.floor((Date.now() - startMs) / 1000));
      } else {
        durSecs = 0;
      }
    }
    return {
      ...item,
      status,
      ended_at: extra?.ended_at || (['completed', 'declined', 'missed'].includes(status) ? now : item.ended_at),
      duration_seconds: durSecs,
      ...extra,
    };
  };

  // 1. Check inbound queue (room -> reception)
  let idx = global.__intercomCallQueue.findIndex((c) => c.call_id === call_id);
  if (idx !== -1) {
    const updated = processRecord(global.__intercomCallQueue[idx]);
    global.__intercomCallQueue[idx] = updated;
    if (['completed', 'missed', 'declined'].includes(status)) {
      global.__intercomCallQueue.splice(idx, 1);
      _pushToHistory(updated);
    }
    return true;
  }

  // 2. Check room-incoming queue (reception -> room)
  idx = global.__intercomRoomCallQueue.findIndex((c) => c.call_id === call_id);
  if (idx !== -1) {
    const updated = processRecord(global.__intercomRoomCallQueue[idx]);
    global.__intercomRoomCallQueue[idx] = updated;
    if (['completed', 'missed', 'declined'].includes(status)) {
      global.__intercomRoomCallQueue.splice(idx, 1);
      _pushToHistory(updated);
    }
    return true;
  }

  // 3. Check history directly
  idx = global.__intercomCallHistory.findIndex((c) => c.call_id === call_id);
  if (idx !== -1) {
    const updated = processRecord(global.__intercomCallHistory[idx]);
    global.__intercomCallHistory[idx] = updated;
    return true;
  }

  return false;
}

function _pushToHistory(call: IntercomCall) {
  global.__intercomCallHistory = global.__intercomCallHistory.filter(
    (c) => c.call_id !== call.call_id
  );
  global.__intercomCallHistory.unshift(call);
  if (global.__intercomCallHistory.length > 50) {
    global.__intercomCallHistory = global.__intercomCallHistory.slice(0, 50);
  }
}

// ── Auto-expire ringing calls ───────────────────────────────────────────────
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
