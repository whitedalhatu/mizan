"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
