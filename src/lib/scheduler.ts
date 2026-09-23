import "server-only";

// =====================================================================
// MIZAN placement engine (Stage 2b)
//
// Turns a campaign's segments into scheduled_plays — one row per intended
// airing, each placed into a real break. Pure logic given the inputs, so it's
// testable and tunable. The action layer fetches the data and writes the rows.
//
// Rules (from the design conversation):
//  - auto-distribute plays across eligible breaks in the segment's hour window
//  - skip breaks that already hold a competitor (same category)
//  - skip breaks that are full (break capacity vs spots already placed)
//  - cascade: if no in-window break works, use an out-of-window break with room.
//    This is normal placement (silent) — NOT "shifted". The shifted flag is only
//    set later from playout when an ad actually airs at a different time.
//  - rotate through the segment's materials across the plays
// =====================================================================

export type Break = {
  id: string;
  start_time: string;      // "HH:MM:SS"
  duration_secs: number;
  runs: Record<string, boolean>; // runs_mon..runs_sun
};

export type Segment = {
  id: string;
  start_date: string;      // YYYY-MM-DD
  end_date: string;
  runs: Record<string, boolean>;
  hour_from: string;       // "HH:MM:SS"
  hour_to: string;
  plays_count: number;
  plays_basis: "per_day" | "per_segment";
  material_ids: string[];  // rotation order
  break_ids: string[] | null; // pinned eligible breaks, or null = all in window
};

export type MaterialDur = Record<string, number>; // material_id -> duration_secs

// A competitor occupancy map: for a given (break_id + date), which competitor
// customer_ids already have a spot there (from other campaigns' scheduled plays).
export type CompetitorOccupancy = Map<string, Set<string>>; // key `${breakId}|${date}` -> set of competitor customer ids

export type PlacedPlay = {
  segment_id: string;
  material_id: string;
  play_date: string;
  intended_from: string;
  intended_to: string;
  break_id: string | null;
  actual_time: string | null;
  shifted: boolean;
  shift_reason: string | null;
};

const DAY_KEY = ["runs_sun", "runs_mon", "runs_tue", "runs_wed", "runs_thu", "runs_fri", "runs_sat"];

function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (d <= last) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return out;
}
function weekdayKey(dateStr: string): string {
  return DAY_KEY[new Date(dateStr + "T00:00:00").getDay()];
}
function inWindow(t: string, from: string, to: string): boolean {
  return t >= from && t <= to;
}
function hm(t: string): string { return t.slice(0, 5); }

// Plan a single campaign's plays. `spotSecondsByBreakDate` tracks running load
// per (break,date) so capacity is respected across segments within this campaign;
// `competitors` carries other campaigns' occupancy for the competition rule.
export function planCampaign(input: {
  segments: Segment[];
  breaks: Break[];             // all breaks on the campaign's station
  materialDur: MaterialDur;
  competitorCustomerIds: Set<string>;   // customers this campaign must avoid sharing a break with
  competitorOccupancy: CompetitorOccupancy;
}): PlacedPlay[] {
  const { segments, breaks, materialDur, competitorCustomerIds, competitorOccupancy } = input;
  const placed: PlacedPlay[] = [];

  // Running load per (break,date) from THIS campaign's placements so far.
  const load = new Map<string, number>(); // key `${breakId}|${date}` -> seconds used
  const loadKey = (b: string, d: string) => `${b}|${d}`;

  function breakRunsOn(b: Break, dateStr: string): boolean {
    return b.runs[weekdayKey(dateStr)] === true;
  }
  function hasCompetitor(breakId: string, date: string): boolean {
    if (competitorCustomerIds.size === 0) return false;
    const occ = competitorOccupancy.get(`${breakId}|${date}`);
    if (!occ) return false;
    for (const cid of occ) if (competitorCustomerIds.has(cid)) return true;
    return false;
  }
  function fits(b: Break, date: string, spotSecs: number): boolean {
    const used = load.get(loadKey(b.id, date)) ?? 0;
    return used + spotSecs <= b.duration_secs;
  }
  function place(b: Break, date: string, spotSecs: number) {
    load.set(loadKey(b.id, date), (load.get(loadKey(b.id, date)) ?? 0) + spotSecs);
  }

  for (const seg of segments) {
    const dates = eachDate(seg.start_date, seg.end_date).filter((d) => seg.runs[weekdayKey(d)] === true);
    if (dates.length === 0 || seg.material_ids.length === 0) continue;

    // Eligible breaks for this segment (pinned set, else all station breaks).
    const pinned = seg.break_ids && seg.break_ids.length ? new Set(seg.break_ids) : null;
    const segBreaks = breaks.filter((b) => !pinned || pinned.has(b.id));

    // How many plays each date gets.
    // per_day: the same count every active day.
    // per_segment: the total spread as evenly as possible across the active days
    //   (some days get one more than others so the totals sum exactly).
    const playsByDate = new Map<string, number>();
    if (seg.plays_basis === "per_day") {
      for (const d of dates) playsByDate.set(d, seg.plays_count);
    } else {
      const n = dates.length;
      const base = Math.floor(seg.plays_count / n);
      let remainder = seg.plays_count % n; // this many days get one extra
      for (const d of dates) {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder--;
        playsByDate.set(d, base + extra);
      }
    }

    let rot = 0; // material rotation index

    for (const date of dates) {
      const perDay = playsByDate.get(date) ?? 0;
      if (perDay === 0) continue;
      // Breaks that run this weekday, in window, sorted by time.
      const runningToday = segBreaks.filter((b) => breakRunsOn(b, date)).sort((a, z) => a.start_time.localeCompare(z.start_time));
      const inWin = runningToday.filter((b) => inWindow(b.start_time, seg.hour_from, seg.hour_to));
      const outWin = runningToday.filter((b) => !inWindow(b.start_time, seg.hour_from, seg.hour_to));

      for (let i = 0; i < perDay; i++) {
        const materialId = seg.material_ids[rot % seg.material_ids.length];
        rot++;
        const spotSecs = materialDur[materialId] ?? 30;

        // Auto-distribute: rotate the starting index so plays spread across breaks.
        const tryOrder = (list: Break[]) => {
          const n = list.length;
          const order: Break[] = [];
          for (let k = 0; k < n; k++) order.push(list[(i + k) % n]);
          return order;
        };

        // 1) in-window break with room and no competitor.
        let chosen: Break | null = null;
        for (const b of tryOrder(inWin)) {
          if (fits(b, date, spotSecs) && !hasCompetitor(b.id, date)) { chosen = b; break; }
        }
        // 2) cascade: out-of-window break with room and no competitor. This is
        //    normal placement — the ad simply lands in the nearest available
        //    break. It is NOT "shifted"; that label is reserved for real
        //    airing-time differences reported by playout later.
        if (!chosen) {
          for (const b of tryOrder(outWin)) {
            if (fits(b, date, spotSecs) && !hasCompetitor(b.id, date)) { chosen = b; break; }
          }
        }
        // 3) last resort: in-window break ignoring competitor, else nothing.
        if (!chosen) {
          for (const b of tryOrder(inWin)) {
            if (fits(b, date, spotSecs)) { chosen = b; break; }
          }
        }

        if (chosen) {
          place(chosen, date, spotSecs);
          placed.push({
            segment_id: seg.id, material_id: materialId, play_date: date,
            intended_from: seg.hour_from, intended_to: seg.hour_to,
            break_id: chosen.id, actual_time: chosen.start_time,
            shifted: false, shift_reason: null,
          });
        } else {
          // Genuinely nowhere to place it — record as an unplaced play so it's visible.
          placed.push({
            segment_id: seg.id, material_id: materialId, play_date: date,
            intended_from: seg.hour_from, intended_to: seg.hour_to,
            break_id: null, actual_time: null,
            shifted: false, shift_reason: "No break with capacity anywhere that day.",
          });
        }
      }
    }
  }

  return placed;
}
