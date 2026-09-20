"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; message: string };

// The audio file is uploaded from the browser directly to Supabase storage
// (client-side, in the form). This records the material's details once the file
// is in place.
export async function createMaterial(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const name = String(formData.get("name") ?? "").trim();
  const durationSecs = Math.round(Number(formData.get("duration_secs") ?? 0));
  const cartNumber = String(formData.get("cart_number") ?? "").trim();
  const audioPath = String(formData.get("audio_path") ?? "").trim();

  if (!name) return { ok: false, message: "Material name is required." };
  if (!durationSecs || durationSecs <= 0) return { ok: false, message: "Duration must be more than zero." };

  const supabase = createClient();
  const { error } = await supabase.from("materials").insert({
    name, duration_secs: durationSecs, cart_number: cartNumber || null, audio_path: audioPath || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/materials");
  return { ok: true, message: `Material "${name}" added.` };
}

export async function deleteMaterial(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing material." };
  const supabase = createClient();
  const { data: mat } = await supabase.from("materials").select("audio_path").eq("id", id).maybeSingle();
  if (mat?.audio_path) await supabase.storage.from("materials").remove([mat.audio_path]);
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) {
    if (/foreign key|violates/i.test(error.message))
      return { ok: false, message: "This material is used by a campaign — remove it there first." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/materials");
  return { ok: true, message: "Material removed." };
}
