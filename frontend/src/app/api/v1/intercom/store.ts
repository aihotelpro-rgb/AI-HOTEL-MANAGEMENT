import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE IN-MEMORY INTERCOM CALL QUEUE
// This is a global singleton that persists across requests during the Vercel
// serverless function warm window. It acts as the signaling layer between
// room browsers (callers) and the reception browser (receiver).
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __intercomCallQueue: IntercomCall[];
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

// Initialize global stores once
if (!global.__intercomCallQueue) {
  global.__intercomCallQueue = [];
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
      hotel: 'Hotel Blue Bird Inn'
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
      hotel: 'Hotel Blue Bird Inn'
    }
  ];
}

export function getCallQueue() { return global.__intercomCallQueue; }
export function getCallHistory() { return global.__intercomCallHistory; }

export function addCallToQueue(call: IntercomCall) {
  // Remove any existing ringing call from same room (prevent duplicates)
  global.__intercomCallQueue = global.__intercomCallQueue.filter(
    c => !(c.from_room === call.from_room && c.status === 'ringing')
  );
  global.__intercomCallQueue.push(call);
}

export function updateCallStatus(call_id: string, status: IntercomCall['status'], extra?: Partial<IntercomCall>) {
  const idx = global.__intercomCallQueue.findIndex(c => c.call_id === call_id);
  if (idx !== -1) {
    global.__intercomCallQueue[idx] = { ...global.__intercomCallQueue[idx], status, ...extra };
    // Move completed/missed/declined calls to history
    if (['completed', 'missed', 'declined'].includes(status)) {
      const finishedCall = global.__intercomCallQueue.splice(idx, 1)[0];
      global.__intercomCallHistory.unshift(finishedCall);
      // Keep history capped at 50 entries
      if (global.__intercomCallHistory.length > 50) {
        global.__intercomCallHistory = global.__intercomCallHistory.slice(0, 50);
      }
    }
    return true;
  }
  return false;
}

// Auto-expire ringing calls after 45 seconds (mark as missed)
export function expireRingingCalls() {
  const now = Date.now();
  const toExpire = global.__intercomCallQueue.filter(c => {
    return c.status === 'ringing' && now - new Date(c.started_at).getTime() > 45000;
  });
  toExpire.forEach(c => updateCallStatus(c.call_id, 'missed', { ended_at: new Date().toISOString(), duration_seconds: 0 }));
}
