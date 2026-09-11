"use server";

import { getIdentity } from "@/lib/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; message: string };

export async function updateSettings(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };

  const orgName = String(formData.get("org_name") ?? "").trim();
  const primaryColor = String(formData.get("primary_color") ?? "").trim();
  const accentColor = String(formData.get("accent_color") ?? "").trim();
  const inheritEcirsTheme = formData.get("inherit_ecirs_theme") === "on";

  if (!orgName) return { ok: false, message: "Organisation name is required." };
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  if (!HEX.test(primaryColor)) return { ok: false, message: "Primary colour must be a hex value." };
  if (!HEX.test(accentColor)) return { ok: false, message: "Accent colour must be a hex value." };

  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").update({
    org_name: orgName,
    primary_color: primaryColor,
    accent_color: accentColor,
    inherit_ecirs_theme: inheritEcirsTheme,
  }).eq("id", true);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

// The ECIRS connection is wired for real at Stage 4 (the adapter). For now this
// stores the details and marks the intent, so the page is complete and the
// slot is ready. It does not yet talk to ECIRS.
export async function saveEcirsConnection(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const url = String(formData.get("ecirs_url") ?? "").trim();
  const apiKey = String(formData.get("ecirs_api_key") ?? "").trim();

  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").update({
    ecirs_url: url || null,
    ecirs_api_key: apiKey || null,
    // Not actually connected until the Stage 4 adapter verifies it.
    ecirs_connected: false,
  }).eq("id", true);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings");
  return { ok: true, message: "ECIRS details saved. Live connection is enabled in a later stage." };
}
