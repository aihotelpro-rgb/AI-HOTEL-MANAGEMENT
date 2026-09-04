import { NextRequest, NextResponse } from 'next/server';
import {
  AI_OTA_STATE,
  toggleAutoPilot,
  resolveParityIssue,
  applyAiYieldRecommendations
} from '@/lib/aiOtaEngine';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(AI_OTA_STATE, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, channel_code } = body;

    if (action === 'toggle_autopilot') {
      const enabled = toggleAutoPilot();
      return NextResponse.json({
        status: "success",
        autopilot_enabled: enabled,
        message: enabled ? "AI Autonomous Auto-Pilot Yield Sync ENABLED" : "AI Auto-Pilot switched to Manual Review Mode"
      }, { status: 200, headers: CORS_HEADERS });
    }

    if (action === 'resolve_parity') {
      const resolved = resolveParityIssue(channel_code);
      return NextResponse.json({
        status: "success",
        message: resolved ? `Parity disparity resolved for ${channel_code}` : "Issue not found"
      }, { status: 200, headers: CORS_HEADERS });
    }

    if (action === 'apply_yield_tariffs') {
      const result = applyAiYieldRecommendations();
      return NextResponse.json({
        status: "success",
        ...result
      }, { status: 200, headers: CORS_HEADERS });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process AI request" }, { status: 500, headers: CORS_HEADERS });
  }
}
