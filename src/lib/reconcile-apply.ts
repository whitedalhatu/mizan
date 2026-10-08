import "server-only";
import { createClient } from "@/lib/supabase/server";
import { reconcile, parseRadioBossCsv, type ScheduledPlay, type AsRunEntry } from "@/lib/reconcile";

export type ApplyResult = {
  ok: boolean;
  message: string;
  entries?: number;
  matched?: number;
  missed?: number;
  unmatched?: number;
};

// Takes RadioBOSS as-run CSV text + a station, reconciles it against that
// station's scheduled plays for the dates in the log, and updates airing state.
// Used by the manual upload (now) and the agent endpoint (later) alike.
export async function applyAsRunCsv(opts: {
  stationId: string;
  csv: string;
  source: "upload" | "agent";
  markMissesForDates?: boolean; // mark scheduled-but-unaired as missed for the log's dates
}): Promise<ApplyResult> {
  const supabase = createClient();

  const entries: AsRunEntry[] = parseRadioBossCsv(opts.csv);
  if (entries.length === 0) return { ok: false, message: "No usable rows found in the log." };

  // Dates present in the log.
  const dates = Array.from(new Set(entries.map((e) => e.playedDate)));

  // Load this station's scheduled plays for those dates, with material names.
  const { data: playRows } = await supabase
    .from("scheduled_plays")
    .select("id, material_id, play_date, intended_from, intended_to, actual_time, air_state, campaigns!inner ( station_id )")
    .in("play_date", dates);
  // Filter to this station (campaign's station).
  const stationPlays = (playRows ?? []).filter(
    (p) => (p.campaigns as never as { station_id: string })?.station_id === opts.stationId
  );

  // Material names.
  const matIds = Array.from(new Set(stationPlays.map((p) => p.material_id)));
  const { data: mats } = matIds.length
    ? await supabase.from("materials").select("id, name").in("id", matIds)
    : { data: [] as { id: string; name: string }[] };
  const matName = new Map<string, string>((mats ?? []).map((m) => [m.id, m.name]));

  const scheduled: ScheduledPlay[] = stationPlays.map((p) => ({
    id: p.id,
    material_id: p.material_id,
    material_name: matName.get(p.material_id) ?? "",
    play_date: p.play_date,
    intended_from: p.intended_from,
    intended_to: p.intended_to,
    scheduled_time: p.actual_time,
    air_state: p.air_state,
  }));

  const result = reconcile(entries, scheduled);

  // Apply: mark matched plays aired (with actual time + shift flag).
  for (const m of result.matched) {
    await supabase.from("scheduled_plays").update({
      air_state: "aired",
      aired_at: new Date().toISOString(),
      actual_time: m.airedTime,
      shifted: m.shifted,
      shift_reason: m.shifted ? "Aired outside the scheduled hour window (from playout log)." : null,
    }).eq("id", m.playId);
  }

  // Optionally mark the rest (scheduled, due, not aired) as missed.
  if (opts.markMissesForDates) {
    for (const missId of result.missed) {
      await supabase.from("scheduled_plays").update({ air_state: "missed" }).eq("id", missId);
    }
  }

  // Record the run.
  await supabase.from("reconciliation_runs").insert({
    station_id: opts.stationId,
    log_date: dates.length === 1 ? dates[0] : null,
    entries_count: entries.length,
    matched_count: result.matched.length,
    missed_count: opts.markMissesForDates ? result.missed.length : 0,
    unmatched_count: result.unmatchedAsRun.length,
    source: opts.source,
  });

  return {
    ok: true,
    message: `Reconciled ${entries.length} log entries — ${result.matched.length} matched${opts.markMissesForDates ? `, ${result.missed.length} marked missed` : ""}, ${result.unmatchedAsRun.length} unmatched.`,
    entries: entries.length,
    matched: result.matched.length,
    missed: result.missed.length,
    unmatched: result.unmatchedAsRun.length,
  };
}
