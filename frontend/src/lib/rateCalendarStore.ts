import { ROOMS_DATA } from './roomsStore';

export interface RateGridCell {
  rate: number;
  available: number;
  stop_sell: boolean;
  min_los: number;
}

export interface RateGridRow {
  room_type_id: number;
  room_type_name: string;
  room_type_code: string;
  rate_plan_id: number;
  rate_plan_name: string;
  dates: Record<string, RateGridCell>;
}

const today = new Date();
const dates: string[] = [];
for (let i = 0; i < 14; i++) {
  const d = new Date(today.getTime() + i * 86400000);
  dates.push(d.toISOString().split('T')[0]);
}

const roomTypes = [
  { id: 1, name: "Deluxe Heritage Room", code: "DHR", base_rate: 4500.0, units: 10 },
  { id: 2, name: "Royal Heritage Suite", code: "RHS", base_rate: 9500.0, units: 8 },
  { id: 3, name: "Maharaja Penthouse Suite", code: "MPS", base_rate: 18000.0, units: 6 }
];

const ratePlans = [
  { id: 1, name: "Best Available Rate (BAR)", code: "BAR" },
  { id: 2, name: "Non-Refundable Saver", code: "NREF" },
  { id: 3, name: "Royal Breakfast & Spa Package", code: "PKG" }
];

const grid: RateGridRow[] = [];
for (const rt of roomTypes) {
  for (const rp of ratePlans) {
    const date_values: Record<string, RateGridCell> = {};
    for (const d_str of dates) {
      let mult = 1.0;
      if (rp.code === 'NREF') mult = 0.85;
      if (rp.code === 'PKG') mult = 1.25;

      date_values[d_str] = {
        rate: Math.round(rt.base_rate * mult),
        available: rt.units - 2,
        stop_sell: false,
        min_los: 1
      };
    }

    grid.push({
      room_type_id: rt.id,
      room_type_name: rt.name,
      room_type_code: rt.code,
      rate_plan_id: rp.id,
      rate_plan_name: rp.name,
      dates: date_values
    });
  }
}

export let RATE_CALENDAR_STORE = {
  dates,
  grid
};

export function syncRoomsDataWithRate(room_type_id: number, newRate: number) {
  if (!ROOMS_DATA || ROOMS_DATA.length === 0) return;

  let matchedCount = 0;
  ROOMS_DATA.forEach(room => {
    const t = room.room_type.toLowerCase();
    if (!room_type_id || room_type_id === 0) {
      room.price_per_night = newRate;
      matchedCount++;
    } else if (room_type_id === 1) {
      if ((t.includes('deluxe') && !t.includes('super')) || t.includes('executive') || t.includes('king') || t.includes('heritage room')) {
        room.price_per_night = newRate;
        matchedCount++;
      }
    } else if (room_type_id === 2) {
      if (t.includes('super deluxe') || t.includes('sea breeze') || (t.includes('heritage suite') && !t.includes('maharaja'))) {
        room.price_per_night = newRate;
        matchedCount++;
      }
    } else if (room_type_id === 3) {
      if (t.includes('andaman') || t.includes('maharaja') || t.includes('penthouse')) {
        room.price_per_night = newRate;
        matchedCount++;
      }
    }
  });

  if (matchedCount === 0) {
    ROOMS_DATA.forEach(room => {
      room.price_per_night = newRate;
    });
  }
}

export function updateSingleRate(room_type_id: number, rate_plan_id: number, date_str: string, rate: number) {
  const row = RATE_CALENDAR_STORE.grid.find(
    r => (room_type_id ? r.room_type_id === room_type_id : true) && (rate_plan_id ? r.rate_plan_id === rate_plan_id : true)
  ) || RATE_CALENDAR_STORE.grid[0];

  if (row && row.dates[date_str]) {
    row.dates[date_str].rate = rate;
  }

  syncRoomsDataWithRate(room_type_id, rate);
}

export function bulkUpdateRates(room_type_id: number, rate_plan_id: number, start_date: string, end_date: string, rate: number) {
  for (const row of RATE_CALENDAR_STORE.grid) {
    if (room_type_id && row.room_type_id !== room_type_id) continue;
    if (rate_plan_id && row.rate_plan_id !== rate_plan_id) continue;

    for (const d_str of Object.keys(row.dates)) {
      if (d_str >= start_date && d_str <= end_date) {
        row.dates[d_str].rate = rate;
      }
    }
  }

  syncRoomsDataWithRate(room_type_id, rate);
}
