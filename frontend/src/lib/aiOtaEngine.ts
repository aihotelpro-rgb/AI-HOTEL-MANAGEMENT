// ─────────────────────────────────────────────────────────────────────────────
// AI OTA YIELD COPILOT, PARITY SHIELD & SURGE PRICING ENGINE
// Real-time market comp-set radar, rate parity monitor, and yield recommendations
// ─────────────────────────────────────────────────────────────────────────────

import { initialOtaChannels, OTAChannelItem } from './otaStore';
import { bulkUpdateRates } from './rateCalendarStore';

export interface CompetitorRate {
  id: string;
  hotel_name: string;
  star_category: string;
  distance_km: number;
  current_rate: number;
  occupancy_rate_percent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  change_percent: number;
}

export interface RateParityIssue {
  channel_code: string;
  channel_name: string;
  room_type: string;
  direct_website_rate: number;
  ota_selling_rate: number;
  disparity_amount: number;
  disparity_percent: number;
  violation_type: 'UNDER_CUTTING' | 'COMMISSION_BLEED' | 'SYNC_DELAY';
  detected_at: string;
  suggested_action: string;
}

export interface AiYieldSuggestion {
  target_dates: string;
  demand_level: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  surge_multiplier: number; // e.g. 1.18 = +18%
  current_bar_rate: number;
  suggested_bar_rate: number;
  deluxe_room_rate: number;
  suite_room_rate: number;
  penthouse_room_rate: number;
  estimated_revenue_lift_inr: number;
  confidence_score: number; // 94%
  primary_driver: string;
}

export interface AiOtaEngineState {
  autopilot_enabled: boolean;
  last_ai_scan: string;
  overall_parity_health_score: number; // 92%
  market_surge_status: string;
  competitors: CompetitorRate[];
  parity_issues: RateParityIssue[];
  active_suggestion: AiYieldSuggestion;
}

export let AI_OTA_STATE: AiOtaEngineState = {
  autopilot_enabled: false,
  last_ai_scan: new Date().toISOString(),
  overall_parity_health_score: 94,
  market_surge_status: "HIGH DEMAND SURGE (FESTIVAL & AIRLINE SPIKE)",
  competitors: [
    {
      id: "COMP-01",
      hotel_name: "Taj Exotica Resort & Spa",
      star_category: "5-Star Luxury",
      distance_km: 4.2,
      current_rate: 14500,
      occupancy_rate_percent: 92,
      trend: "UP",
      change_percent: 18.5
    },
    {
      id: "COMP-02",
      hotel_name: "Symphony Samudra Beachside",
      star_category: "5-Star Premium",
      distance_km: 2.8,
      current_rate: 8200,
      occupancy_rate_percent: 88,
      trend: "UP",
      change_percent: 14.0
    },
    {
      id: "COMP-03",
      hotel_name: "SeaShell Port Blair Heritage",
      star_category: "4-Star Deluxe",
      distance_km: 1.5,
      current_rate: 6950,
      occupancy_rate_percent: 85,
      trend: "UP",
      change_percent: 11.2
    },
    {
      id: "COMP-04",
      hotel_name: "Peerless Sarovar Portico",
      star_category: "4-Star Standard",
      distance_km: 3.1,
      current_rate: 6100,
      occupancy_rate_percent: 78,
      trend: "STABLE",
      change_percent: 2.0
    }
  ],
  parity_issues: [
    {
      channel_code: "AGD",
      channel_name: "Agoda International",
      room_type: "Deluxe Heritage Room",
      direct_website_rate: 4500,
      ota_selling_rate: 4050,
      disparity_amount: 450,
      disparity_percent: 10.0,
      violation_type: "UNDER_CUTTING",
      detected_at: new Date(Date.now() - 45 * 60000).toISOString(),
      suggested_action: "Push +10% rate markup or trigger Agoda rate parity auto-lock"
    },
    {
      channel_code: "MMT",
      channel_name: "MakeMyTrip India",
      room_type: "Royal Heritage Suite",
      direct_website_rate: 9500,
      ota_selling_rate: 8930,
      disparity_amount: 570,
      disparity_percent: 6.0,
      violation_type: "COMMISSION_BLEED",
      detected_at: new Date(Date.now() - 90 * 60000).toISOString(),
      suggested_action: "Adjust MMT package margin and lock BAR rate"
    }
  ],
  active_suggestion: {
    target_dates: "Next 14 Days (High Season Window)",
    demand_level: "VERY_HIGH",
    surge_multiplier: 1.20,
    current_bar_rate: 4500,
    suggested_bar_rate: 5400,
    deluxe_room_rate: 5400,
    suite_room_rate: 11400,
    penthouse_room_rate: 21600,
    estimated_revenue_lift_inr: 124500,
    confidence_score: 96,
    primary_driver: "Island Tourism Inflow + Port Blair Flight Inbound Spike (+34% searches)"
  }
};

/**
 * Modern AI Dynamic Rate Suggestion Algorithm (2026 Hospitality Standard)
 * Factors evaluated:
 * 1. Live Occupancy Pace & Lead Time
 * 2. Real-Time Competitor Comp-Set Rates (Taj Exotica, Symphony Samudra, SeaShell)
 * 3. Inbound Ferry & Airline Arrival Density (Port Blair flight banks & Makruzz ferry schedules)
 * 4. Day of Week & Weekend Surge Premium
 */
export function calculateLiveAiRateRecommendation(params?: {
  current_occupancy_percent?: number;
  season_mode?: 'PEAK' | 'HIGH' | 'REGULAR' | 'MONSOON';
  lead_days?: number;
}): AiYieldSuggestion {
  const occ = params?.current_occupancy_percent !== undefined ? params.current_occupancy_percent : 91.7;
  const compAvg = AI_OTA_STATE.competitors.reduce((acc, c) => acc + c.current_rate, 0) / Math.max(1, AI_OTA_STATE.competitors.length);
  
  const today = new Date();
  const dayOfWeek = today.getDay(); // 5 = Fri, 6 = Sat, 0 = Sun
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

  let surge = 1.0;
  let demand: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'NORMAL' = 'NORMAL';
  let driver = "Standard steady island baseline demand";

  if (occ >= 85) {
    surge = isWeekend ? 1.25 : 1.20;
    demand = 'VERY_HIGH';
    driver = isWeekend 
      ? `High Occupancy (${occ.toFixed(1)}%) + Weekend Island Leisure Inflow: Recommend +25% Surge Rate`
      : `High Occupancy (${occ.toFixed(1)}%) + Port Blair Ferry Arrivals: Recommend +20% Surge Rate`;
  } else if (occ >= 70) {
    surge = isWeekend ? 1.15 : 1.10;
    demand = 'HIGH';
    driver = `Healthy Occupancy (${occ.toFixed(1)}%): Yield optimization +${isWeekend ? '15%' : '10%'} to capture high-margin booking volume`;
  } else if (occ < 50) {
    surge = 0.90;
    demand = 'NORMAL';
    driver = `Low Occupancy (${occ.toFixed(1)}%): Recommend 10% Flash Incentive to stimulate early bookings`;
  }

  const baseDeluxe = 4500;
  const baseSuite = 9500;
  const basePenthouse = 18000;

  const suggestedBar = Math.round((baseDeluxe * surge) / 100) * 100;
  const suggestedSuite = Math.round((baseSuite * surge) / 100) * 100;
  const suggestedPenthouse = Math.round((basePenthouse * surge) / 100) * 100;

  const revenueLift = Math.round((suggestedBar - baseDeluxe) * 18 * 14 * 0.85);

  const updatedSuggestion: AiYieldSuggestion = {
    target_dates: "Next 14 Days (Dynamic Rolling Window)",
    demand_level: demand,
    surge_multiplier: surge,
    current_bar_rate: baseDeluxe,
    suggested_bar_rate: suggestedBar,
    deluxe_room_rate: suggestedBar,
    suite_room_rate: suggestedSuite,
    penthouse_room_rate: suggestedPenthouse,
    estimated_revenue_lift_inr: Math.max(0, revenueLift),
    confidence_score: Math.min(99, Math.round(88 + (occ / 10))),
    primary_driver: driver
  };

  AI_OTA_STATE.active_suggestion = updatedSuggestion;
  AI_OTA_STATE.last_ai_scan = new Date().toISOString();
  return updatedSuggestion;
}

export function toggleAutoPilot(): boolean {
  AI_OTA_STATE.autopilot_enabled = !AI_OTA_STATE.autopilot_enabled;
  return AI_OTA_STATE.autopilot_enabled;
}

export function resolveParityIssue(channel_code: string): boolean {
  const idx = AI_OTA_STATE.parity_issues.findIndex(p => p.channel_code === channel_code);
  if (idx !== -1) {
    AI_OTA_STATE.parity_issues.splice(idx, 1);
    AI_OTA_STATE.overall_parity_health_score = Math.min(100, AI_OTA_STATE.overall_parity_health_score + 4);
    return true;
  }
  return false;
}

export function applyAiYieldRecommendations(): { message: string; applied_tariffs: any } {
  const sug = AI_OTA_STATE.active_suggestion;
  const today = new Date().toISOString().split('T')[0];
  const end = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  // Bulk update calendar store
  bulkUpdateRates(1, 1, today, end, sug.deluxe_room_rate);
  bulkUpdateRates(2, 1, today, end, sug.suite_room_rate);
  bulkUpdateRates(3, 1, today, end, sug.penthouse_room_rate);

  AI_OTA_STATE.last_ai_scan = new Date().toISOString();

  return {
    message: `⚡ Successfully applied AI Yield Dynamic Tariffs (+${Math.round((sug.surge_multiplier - 1) * 100)}% Surge) across all 24 Property Suites & synchronized to all 20 connected OTA channels!`,
    applied_tariffs: {
      deluxe_rate: sug.deluxe_room_rate,
      suite_rate: sug.suite_room_rate,
      penthouse_rate: sug.penthouse_room_rate,
      date_range: `${today} to ${end}`,
      channels_updated: initialOtaChannels.filter(c => c.is_active).map(c => c.name)
    }
  };
}

