"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; message: string };

async function requireUser(): Promise<Result | null> {
  const id = await getIdentity();
  if (!id) return { ok: false, message: "Please sign in." };
  return null;
}

// Create a station: identity + optional playout connection. In standalone MIZAN
// the identity is typed here; when connected to ECIRS (Stage 4) it is imported.
export async function createStation(formData: FormData): Promise<Result> {
  const denied = await requireUser();
  if (denied) return denied;

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const playoutType = String(formData.get("playout_type") ?? "none");

  if (!/^[A-Z]{2,4}$/.test(code)) return { ok: false, message: "Code must be 2\u20134 letters." };
  if (!name) return { ok: false, message: "Station name is required." };
  if (!["none", "radioboss", "other"].includes(playoutType)) {
    return { ok: false, message: "Choose a valid playout type." };
  }

  // Gather playout config by type. RadioBOSS first; structure open for more.
  let playoutConfig: Record<string, string> = {};
  if (playoutType === "radioboss") {
    playoutConfig = {
      // Stored now, used at Stage 6 to read the as-run log. What RadioBOSS
      // needs exactly is finalised when we build the adapter; these are the
      // likely fields.
      api_url: String(formData.get("rb_api_url") ?? "").trim(),
      api_password: String(formData.get("rb_api_password") ?? "").trim(),
    };
  } else if (playoutType === "other") {
    playoutConfig = { note: String(formData.get("other_note") ?? "").trim() };
  }
  const configured = playoutType !== "none";

  const supabase = createClient();
  const { error } = await supabase.from("stations").insert({
    code, name, frequency: frequency || null,
    identity_source: "mizan",
    playout_type: playoutType,
    playout_config: playoutConfig,
    playout_status: configured ? "configured" : "not_configured",
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, message: `A station with code ${code} already exists.` };
    }
    return { ok: false, message: error.message };
  }
  revalidatePath("/stations");
  return { ok: true, message: `Station ${code} created.` };
}

export async function setStationActive(formData: FormData): Promise<Result> {
  const denied = await requireUser();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return { ok: false, message: "Missing station." };
  const supabase = createClient();
  const { error } = await supabase.from("stations").update({ active }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/stations");
  return { ok: true, message: active ? "Station reactivated." : "Station deactivated." };
}

export async function deleteStation(formData: FormData): Promise<Result> {
  const denied = await requireUser();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing station." };
  const supabase = createClient();
  // Breaks cascade-delete with the station (FK on delete cascade). Campaigns
  // don't exist yet (Stage 1), so nothing else to guard here in Stage 0.
  const { error } = await supabase.from("stations").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/stations");
  return { ok: true, message: "Station deleted." };
}
