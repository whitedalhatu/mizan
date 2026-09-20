"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { planCampaign, type Segment, type Break } from "@/lib/scheduler";

type Result = { ok: boolean; message: string };

// --- Campaign status: draft <-> active, and cancel ---
export async function setCampaignStatus(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("campaign_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return { ok: false, message: "Missing campaign." };
  if (!["draft", "active", "completed", "cancelled"].includes(status))
    return { ok: false, message: "Invalid status." };

  const supabase = createClient();

  // Activating requires at least one segment (there's nothing to run otherwise).
  if (status === "active") {
    const { count } = await supabase.from("segments").select("id", { count: "exact", head: true }).eq("campaign_id", id);
    if (!count) return { ok: false, message: "Add at least one segment before activating." };
  }

  const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
  return { ok: true, message: status === "active" ? "Campaign activated." : status === "draft" ? "Moved back to draft." : `Campaign ${status}.` };
}

// --- Segments ---
export async function createSegment(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };

  const campaignId = String(formData.get("campaign_id") ?? "");
  const name = String(formData.get("name") ?? "").trim() || "Segment";
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const hourFrom = String(formData.get("hour_from") ?? "00:00");
  const hourTo = String(formData.get("hour_to") ?? "23:59");
  const playsCount = Math.round(Number(formData.get("plays_count") ?? 0));
  const playsBasis = String(formData.get("plays_basis") ?? "per_day");
  const materialIds = formData.getAll("material_ids").map(String).filter(Boolean);

  if (!campaignId) return { ok: false, message: "Missing campaign." };
  if (!startDate || !endDate) return { ok: false, message: "Set the segment dates." };
  if (endDate < startDate) return { ok: false, message: "End date can't be before the start date." };
  if (!playsCount || playsCount <= 0) return { ok: false, message: "Plays must be more than zero." };
  if (!["per_day", "per_segment"].includes(playsBasis)) return { ok: false, message: "Invalid plays basis." };
  if (materialIds.length === 0) return { ok: false, message: "Pick at least one material to rotate." };

  const days = {
    runs_mon: formData.get("runs_mon") === "on", runs_tue: formData.get("runs_tue") === "on",
    runs_wed: formData.get("runs_wed") === "on", runs_thu: formData.get("runs_thu") === "on",
    runs_fri: formData.get("runs_fri") === "on", runs_sat: formData.get("runs_sat") === "on",
    runs_sun: formData.get("runs_sun") === "on",
  };
  if (!Object.values(days).some(Boolean)) return { ok: false, message: "Select at least one weekday." };

  const supabase = createClient();
  // Segment dates must sit within the campaign's own dates.
  const { data: camp } = await supabase.from("campaigns").select("start_date, end_date").eq("id", campaignId).maybeSingle();
  if (camp && (startDate < camp.start_date || endDate > camp.end_date)) {
    return { ok: false, message: `Segment dates must fall within the campaign (${camp.start_date} to ${camp.end_date}).` };
  }

  const { data: seg, error } = await supabase.from("segments").insert({
    campaign_id: campaignId, name, start_date: startDate, end_date: endDate,
    hour_from: hourFrom, hour_to: hourTo, plays_count: playsCount, plays_basis: playsBasis, ...days,
  }).select("id").single();
  if (error) return { ok: false, message: error.message };

  const rows = materialIds.map((mid, i) => ({ segment_id: seg.id, material_id: mid, position: i }));
  const { error: mErr } = await supabase.from("segment_materials").insert(rows);
  if (mErr) {
    await supabase.from("segments").delete().eq("id", seg.id);
    return { ok: false, message: "Could not attach materials: " + mErr.message };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: `Segment "${name}" added.` };
}

export async function deleteSegment(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("segment_id") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!id) return { ok: false, message: "Missing segment." };
  const supabase = createClient();
  const { error } = await supabase.from("segments").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: "Segment removed." };
}

// --- Generate the schedule: walk segments, place plays, write scheduled_plays ---

export async function generateSchedule(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!campaignId) return { ok: false, message: "Missing campaign." };

  const supabase = createClient();

  const { data: campaign } = await supabase
    .from("campaigns").select("id, station_id, customer_id, competition_mode").eq("id", campaignId).maybeSingle();
  if (!campaign) return { ok: false, message: "Campaign not found." };

  // Segments + their materials/pinned breaks.
  const { data: segs } = await supabase
    .from("segments")
    .select("id, start_date, end_date, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat, runs_sun, hour_from, hour_to, plays_count, plays_basis")
    .eq("campaign_id", campaignId);
  if (!segs || segs.length === 0) return { ok: false, message: "Add at least one segment first." };

  const segIds = segs.map((s) => s.id);
  const { data: segMats } = await supabase.from("segment_materials").select("segment_id, material_id, position").in("segment_id", segIds);
  const { data: segBrks } = await supabase.from("segment_breaks").select("segment_id, break_id").in("segment_id", segIds);

  // Breaks on the station.
  const { data: brks } = await supabase
    .from("commercial_breaks")
    .select("id, start_time, duration_secs, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat, runs_sun, active")
    .eq("station_id", campaign.station_id).eq("active", true);

  // Material durations.
  const { data: mats } = await supabase.from("materials").select("id, duration_secs");
  const materialDur: Record<string, number> = {};
  (mats ?? []).forEach((m) => { materialDur[m.id] = m.duration_secs; });

  // Shape for the engine.
  const materialsBySeg = new Map<string, { id: string; pos: number }[]>();
  (segMats ?? []).forEach((r) => {
    const arr = materialsBySeg.get(r.segment_id) ?? [];
    arr.push({ id: r.material_id, pos: r.position });
    materialsBySeg.set(r.segment_id, arr);
  });
  const breaksBySeg = new Map<string, string[]>();
  (segBrks ?? []).forEach((r) => {
    const arr = breaksBySeg.get(r.segment_id) ?? [];
    arr.push(r.break_id); breaksBySeg.set(r.segment_id, arr);
  });

  const segments: Segment[] = segs.map((s) => ({
    id: s.id, start_date: s.start_date, end_date: s.end_date,
    runs: {
      runs_mon: s.runs_mon, runs_tue: s.runs_tue, runs_wed: s.runs_wed, runs_thu: s.runs_thu,
      runs_fri: s.runs_fri, runs_sat: s.runs_sat, runs_sun: s.runs_sun,
    },
    hour_from: s.hour_from, hour_to: s.hour_to, plays_count: s.plays_count, plays_basis: s.plays_basis,
    material_ids: (materialsBySeg.get(s.id) ?? []).sort((a, b) => a.pos - b.pos).map((m) => m.id),
    break_ids: breaksBySeg.get(s.id) ?? null,
  }));

  const breaks: Break[] = (brks ?? []).map((b) => ({
    id: b.id, start_time: b.start_time, duration_secs: b.duration_secs,
    runs: {
      runs_mon: b.runs_mon, runs_tue: b.runs_tue, runs_wed: b.runs_wed, runs_thu: b.runs_thu,
      runs_fri: b.runs_fri, runs_sat: b.runs_sat, runs_sun: b.runs_sun,
    },
  }));

  // Competition: which customers this campaign must avoid, and where they already sit.
  const competitorCustomerIds = new Set<string>();
  const competitorOccupancy = new Map<string, Set<string>>();

  if (campaign.competition_mode === "auto") {
    // Same-category customers are competitors.
    const { data: me } = await supabase.from("customers").select("category_id").eq("id", campaign.customer_id).maybeSingle();
    if (me?.category_id) {
      const { data: sameCat } = await supabase.from("customers").select("id").eq("category_id", me.category_id).neq("id", campaign.customer_id);
      (sameCat ?? []).forEach((c) => competitorCustomerIds.add(c.id));
    }
  } else if (campaign.competition_mode === "manual") {
    const { data: comps } = await supabase.from("campaign_competitors").select("competitor_customer_id").eq("campaign_id", campaignId);
    (comps ?? []).forEach((r) => competitorCustomerIds.add(r.competitor_customer_id));
  }

  // Where competitors already have plays (other active campaigns on this station).
  if (competitorCustomerIds.size > 0) {
    const { data: others } = await supabase
      .from("scheduled_plays")
      .select("break_id, play_date, campaigns!inner ( customer_id, station_id )")
      .not("break_id", "is", null);
    (others ?? []).forEach((r) => {
      const camp = r.campaigns as never as { customer_id: string; station_id: string };
      if (!camp || camp.station_id !== campaign.station_id) return;
      if (!competitorCustomerIds.has(camp.customer_id)) return;
      const key = `${r.break_id}|${r.play_date}`;
      const set = competitorOccupancy.get(key) ?? new Set<string>();
      set.add(camp.customer_id); competitorOccupancy.set(key, set);
    });
  }

  // Run the engine.
  const placed = planCampaign({ segments, breaks, materialDur, competitorCustomerIds, competitorOccupancy });

  // Rebuild: clear this campaign's existing scheduled plays (draft rebuild), then insert.
  await supabase.from("scheduled_plays").delete().eq("campaign_id", campaignId);
  if (placed.length > 0) {
    const rows = placed.map((p) => ({
      campaign_id: campaignId, segment_id: p.segment_id, material_id: p.material_id,
      play_date: p.play_date, intended_from: p.intended_from, intended_to: p.intended_to,
      break_id: p.break_id, actual_time: p.actual_time, shifted: p.shifted, shift_reason: p.shift_reason,
      air_state: "scheduled",
    }));
    // insert in chunks to be safe
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("scheduled_plays").insert(rows.slice(i, i + 500));
      if (error) return { ok: false, message: "Schedule write failed: " + error.message };
    }
  }

  const shiftedCount = placed.filter((p) => p.shifted).length;
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: `Schedule generated — ${placed.length} plays${shiftedCount ? `, ${shiftedCount} shifted` : ""}.` };
}

// --- Edit a draft campaign's core details ---
export async function updateCampaign(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const customerId = String(formData.get("customer_id") ?? "");
  const stationId = String(formData.get("station_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const competitionMode = String(formData.get("competition_mode") ?? "auto");

  if (!id) return { ok: false, message: "Missing campaign." };
  if (!name) return { ok: false, message: "Campaign name is required." };
  if (!customerId) return { ok: false, message: "Choose a customer." };
  if (!stationId) return { ok: false, message: "Choose a station." };
  if (!startDate || !endDate) return { ok: false, message: "Set the run dates." };
  if (endDate < startDate) return { ok: false, message: "End date can't be before the start date." };
  if (!["auto", "manual", "none"].includes(competitionMode)) return { ok: false, message: "Invalid competition mode." };

  const supabase = createClient();

  // Only drafts are editable.
  const { data: current } = await supabase.from("campaigns").select("status, station_id").eq("id", id).maybeSingle();
  if (!current) return { ok: false, message: "Campaign not found." };
  if (current.status !== "draft") return { ok: false, message: "Only draft campaigns can be edited." };

  // If the station changed, the schedule was placed on the old station's breaks —
  // clear it (segments stay; regenerate after). Also flag segments that now fall
  // outside the new dates isn't auto-fixed here; the detail page shows them.
  const stationChanged = current.station_id !== stationId;

  const { error } = await supabase.from("campaigns").update({
    name, customer_id: customerId, station_id: stationId,
    start_date: startDate, end_date: endDate, competition_mode: competitionMode,
  }).eq("id", id);
  if (error) return { ok: false, message: error.message };

  if (stationChanged) {
    await supabase.from("scheduled_plays").delete().eq("campaign_id", id);
  }

  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
  return {
    ok: true,
    message: stationChanged
      ? "Campaign updated. The station changed, so the schedule was cleared — regenerate it."
      : "Campaign updated.",
  };
}
