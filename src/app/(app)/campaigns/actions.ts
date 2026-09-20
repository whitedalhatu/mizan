"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; message: string; id?: string };

export async function createCampaign(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };

  const name = String(formData.get("name") ?? "").trim();
  const customerId = String(formData.get("customer_id") ?? "");
  const stationId = String(formData.get("station_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const competitionMode = String(formData.get("competition_mode") ?? "auto");
  const materialIds = formData.getAll("material_ids").map(String).filter(Boolean);

  if (!name) return { ok: false, message: "Campaign name is required." };
  if (!customerId) return { ok: false, message: "Choose a customer." };
  if (!stationId) return { ok: false, message: "Choose a station." };
  if (!startDate || !endDate) return { ok: false, message: "Set the run dates." };
  if (endDate < startDate) return { ok: false, message: "End date can't be before the start date." };
  if (materialIds.length === 0) return { ok: false, message: "Add at least one material." };
  if (!["auto", "manual", "none"].includes(competitionMode)) return { ok: false, message: "Invalid competition mode." };

  const supabase = createClient();
  const { data: created, error } = await supabase
    .from("campaigns")
    .insert({
      name, customer_id: customerId, station_id: stationId,
      start_date: startDate, end_date: endDate,
      competition_mode: competitionMode, status: "draft",
    })
    .select("id, number").single();
  if (error) return { ok: false, message: error.message };

  const rows = materialIds.map((mid) => ({ campaign_id: created.id, material_id: mid }));
  const { error: mErr } = await supabase.from("campaign_materials").insert(rows);
  if (mErr) {
    await supabase.from("campaigns").delete().eq("id", created.id);
    return { ok: false, message: "Could not attach materials: " + mErr.message };
  }

  if (competitionMode === "manual") {
    const competitorIds = formData.getAll("competitor_ids").map(String).filter(Boolean);
    if (competitorIds.length) {
      await supabase.from("campaign_competitors")
        .insert(competitorIds.map((cid) => ({ campaign_id: created.id, competitor_customer_id: cid })));
    }
  }

  revalidatePath("/campaigns");
  return { ok: true, message: `Campaign ${created.number} created.`, id: created.id };
}

export async function deleteCampaign(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing campaign." };
  const supabase = createClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/campaigns");
  return { ok: true, message: "Campaign removed." };
}
