"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; message: string };

export async function createBreak(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };

  const stationId = String(formData.get("station_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim(); // HH:MM
  const durationMins = Number(formData.get("duration_mins") ?? 0) || 0;

  if (!stationId) return { ok: false, message: "Choose a station." };
  if (!name) return { ok: false, message: "Give the break a name." };
  if (!/^\d{2}:\d{2}$/.test(startTime)) return { ok: false, message: "Start time must be HH:MM." };
  if (durationMins <= 0) return { ok: false, message: "Duration must be more than zero." };

  const days = {
    runs_mon: formData.get("mon") === "on",
    runs_tue: formData.get("tue") === "on",
    runs_wed: formData.get("wed") === "on",
    runs_thu: formData.get("thu") === "on",
    runs_fri: formData.get("fri") === "on",
    runs_sat: formData.get("sat") === "on",
    runs_sun: formData.get("sun") === "on",
  };
  if (!Object.values(days).some(Boolean)) {
    return { ok: false, message: "Select at least one day the break runs." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("commercial_breaks").insert({
    station_id: stationId,
    name,
    start_time: startTime + ":00",
    duration_secs: Math.round(durationMins * 60),
    ...days,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/breaks");
  return { ok: true, message: `Break "${name}" added.` };
}

export async function deleteBreak(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing break." };
  const supabase = createClient();
  const { error } = await supabase.from("commercial_breaks").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/breaks");
  return { ok: true, message: "Break removed." };
}

export async function updateBreak(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim(); // HH:MM
  const durationMins = Number(formData.get("duration_mins") ?? 0) || 0;

  if (!id) return { ok: false, message: "Missing break." };
  if (!name) return { ok: false, message: "Give the break a name." };
  if (!/^\d{2}:\d{2}$/.test(startTime)) return { ok: false, message: "Start time must be HH:MM." };
  if (durationMins <= 0) return { ok: false, message: "Duration must be more than zero." };

  const days = {
    runs_mon: formData.get("mon") === "on",
    runs_tue: formData.get("tue") === "on",
    runs_wed: formData.get("wed") === "on",
    runs_thu: formData.get("thu") === "on",
    runs_fri: formData.get("fri") === "on",
    runs_sat: formData.get("sat") === "on",
    runs_sun: formData.get("sun") === "on",
  };
  if (!Object.values(days).some(Boolean)) {
    return { ok: false, message: "Select at least one day the break runs." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("commercial_breaks").update({
    name,
    start_time: startTime + ":00",
    duration_secs: Math.round(durationMins * 60),
    ...days,
  }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/breaks");
  return { ok: true, message: `Break "${name}" updated.` };
}
