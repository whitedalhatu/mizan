import { NextResponse } from "next/server";
import { verifyAgentKey } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildM3U } from "@/lib/m3u";

export const dynamic = "force-dynamic";

// Hands the station agent the day's schedule for a station: an M3U playlist
// (ordered by time) plus the list of audio files it needs (with signed URLs to
// download). The agent drops these into RadioBOSS's watched folders.
export async function GET(request: Request) {
  if (!(await verifyAgentKey(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const stationId = url.searchParams.get("station") ?? "";
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!stationId) return NextResponse.json({ error: "station required" }, { status: 400 });

  const admin = createAdminClient();

  // Scheduled plays for this station + date, ordered by time.
  const { data: playRows } = await admin
    .from("scheduled_plays")
    .select("id, material_id, play_date, actual_time, campaigns!inner ( station_id, status )")
    .eq("play_date", date)
    .order("actual_time");
  const plays = (playRows ?? []).filter((p) => {
    const camp = p.campaigns as never as { station_id: string; status: string };
    return camp?.station_id === stationId && camp?.status === "active";
  });

  // Material details + audio paths.
  const matIds = Array.from(new Set(plays.map((p) => p.material_id)));
  const { data: mats } = matIds.length
    ? await admin.from("materials").select("id, name, audio_path, cart_number").in("id", matIds)
    : { data: [] as { id: string; name: string; audio_path: string | null; cart_number: string | null }[] };
  const matById = new Map<string, { id: string; name: string; audio_path: string | null; cart_number: string | null }>((mats ?? []).map((m) => [m.id, m]));

  // Signed download URLs for each distinct audio file (1-hour validity).
  const audioFiles: { name: string; url: string; cart_number: string | null }[] = [];
  for (const m of mats ?? []) {
    if (!m.audio_path) continue;
    const { data: signed } = await admin.storage.from("materials").createSignedUrl(m.audio_path, 3600);
    if (signed?.signedUrl) audioFiles.push({ name: m.name, url: signed.signedUrl, cart_number: m.cart_number });
  }

  // Build the M3U playlist (ordered entries).
  const entries = plays.map((p) => {
    const m = matById.get(p.material_id);
    return { time: p.actual_time ? String(p.actual_time).slice(0, 8) : "", filename: m?.name ?? "" };
  }).filter((e) => e.filename);

  const m3u = buildM3U(entries);

  return NextResponse.json({
    station_id: stationId,
    date,
    m3u,                 // the playlist text to drop in the traffic-log folder
    audio_files: audioFiles, // files to download into the spots folder
    play_count: entries.length,
  });
}
