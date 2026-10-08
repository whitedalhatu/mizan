import "server-only";

// =====================================================================
// MIZAN reconciliation (Stage 6 Phase 1)
//
// Takes RadioBOSS's as-run log (what actually played) and matches each played
// spot to the right scheduled_play, so MIZAN can mark it aired — automatically,
// from playout, no human. Pure logic given the inputs, so it's testable with the
// real CSV data before the agent that delivers it exists.
//
// RadioBOSS broadcast-log CSV rows look like:
//   Artist = filename (e.g. "DODAN FOODS HAUSA.mp3"), Length, Start Date, Start Time
//
// Matching approach (a): only match plays MIZAN scheduled on that station/date.
// An as-run entry whose material/time we don't recognise is left unmatched (not
// an error — just "not ours").
// =====================================================================

export type AsRunEntry = {
  filename: string;     // RadioBOSS "Artist" column — the audio file name
  playedDate: string;   // YYYY-MM-DD (normalised from "9/16/2026")
  playedTime: string;   // HH:MM:SS (24h, normalised from "12:52:54 PM")
};

export type ScheduledPlay = {
  id: string;
  material_id: string;
  material_name: string;   // the stored material name (matches filename)
  play_date: string;       // YYYY-MM-DD
  intended_from: string;   // HH:MM:SS — segment window start
  intended_to: string;     // HH:MM:SS — segment window end
  scheduled_time: string | null; // HH:MM:SS the break it was placed in (actual_time)
  air_state: string;       // current state
};

export type ReconResult = {
  matched: { playId: string; airedTime: string; shifted: boolean }[];
  missed: string[];        // scheduled play ids with no matching as-run entry
  unmatchedAsRun: AsRunEntry[]; // played spots we couldn't tie to a scheduled play
};

// Normalise a filename for comparison: lower-case, trim, drop extension variance.
function norm(name: string): string {
  return name.trim().toLowerCase();
}
function secs(t: string): number {
  const [h, m, s] = t.split(":").map((x) => parseInt(x, 10) || 0);
  return h * 3600 + m * 60 + s;
}

// How far from the intended window (in minutes) still counts as "aired on time"
// vs a real "shift". Within the window = on time. Outside = shifted.
export function reconcile(asRun: AsRunEntry[], scheduled: ScheduledPlay[]): ReconResult {
  const matched: ReconResult["matched"] = [];
  const unmatchedAsRun: AsRunEntry[] = [];
  const usedPlayIds = new Set<string>();

  // Index scheduled plays by (date + normalised material name) for quick lookup.
  const byKey = new Map<string, ScheduledPlay[]>();
  for (const sp of scheduled) {
    const key = `${sp.play_date}|${norm(sp.material_name)}`;
    const arr = byKey.get(key) ?? [];
    arr.push(sp); byKey.set(key, arr);
  }

  for (const entry of asRun) {
    const key = `${entry.playedDate}|${norm(entry.filename)}`;
    const candidates = (byKey.get(key) ?? []).filter((sp) => !usedPlayIds.has(sp.id));
    if (candidates.length === 0) { unmatchedAsRun.push(entry); continue; }

    // Pick the candidate whose scheduled time is closest to when it actually played.
    const playedSecs = secs(entry.playedTime);
    candidates.sort((a, b) => {
      const at = a.scheduled_time ? secs(a.scheduled_time) : secs(a.intended_from);
      const bt = b.scheduled_time ? secs(b.scheduled_time) : secs(b.intended_from);
      return Math.abs(at - playedSecs) - Math.abs(bt - playedSecs);
    });
    const chosen = candidates[0];
    usedPlayIds.add(chosen.id);

    // Shifted = it aired outside its intended hour window.
    const inWindow = entry.playedTime >= chosen.intended_from && entry.playedTime <= chosen.intended_to;
    matched.push({ playId: chosen.id, airedTime: entry.playedTime, shifted: !inWindow });
  }

  // Any scheduled play (that was due by now) with no match is a miss.
  const missed = scheduled.filter((sp) => !usedPlayIds.has(sp.id)).map((sp) => sp.id);

  return { matched, missed, unmatchedAsRun };
}

// --- CSV parsing: RadioBOSS broadcast log ---
// Columns: Artist, Length, Start Date, Start Time (order/names may vary slightly).
export function parseRadioBossCsv(csv: string): AsRunEntry[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Find header row and column indexes (tolerant of naming).
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idxArtist = header.findIndex((h) => h.includes("artist") || h.includes("title") || h.includes("file") || h.includes("name"));
  const idxDate = header.findIndex((h) => h.includes("date"));
  const idxTime = header.findIndex((h) => h.includes("time"));
  const hasHeader = idxArtist !== -1 && idxDate !== -1 && idxTime !== -1;

  const out: AsRunEntry[] = [];
  const startRow = hasHeader ? 1 : 0;
  for (let i = startRow; i < lines.length; i++) {
    if (/^total/i.test(lines[i])) continue; // skip "Total duration" footer
    const cols = splitCsvLine(lines[i]);
    const filename = (hasHeader ? cols[idxArtist] : cols[0])?.trim();
    const dateRaw = (hasHeader ? cols[idxDate] : cols[2])?.trim();
    const timeRaw = (hasHeader ? cols[idxTime] : cols[3])?.trim();
    if (!filename || !dateRaw || !timeRaw) continue;
    const playedDate = normDate(dateRaw);
    const playedTime = normTime(timeRaw);
    if (!playedDate || !playedTime) continue;
    out.push({ filename, playedDate, playedTime });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  // Handles simple CSV with optional quotes.
  const out: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if ((ch === "," || ch === "\t") && !inQ) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

// "9/16/2026" -> "2026-09-16"
function normDate(d: string): string | null {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return d;
  return null;
}

// "12:52:54 PM" -> "12:52:54"; "6:23:42 AM" -> "06:23:42"
function normTime(t: string): string | null {
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2]; const sec = m[3] ?? "00";
  const ap = m[4]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}:${sec}`;
}
