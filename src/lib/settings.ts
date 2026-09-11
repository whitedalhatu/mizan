import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type MizanSettings = {
  orgName: string;
  primaryColor: string;
  accentColor: string;
  ecirsConnected: boolean;
  inheritEcirsTheme: boolean;
};

const FALLBACK: MizanSettings = {
  orgName: "MIZAN",
  primaryColor: "#1E3A5F",
  accentColor: "#C77D1A",
  ecirsConnected: false,
  inheritEcirsTheme: false,
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

let cached: { at: number; value: MizanSettings } | null = null;
const TTL_MS = 30_000;

export async function getSettings(): Promise<MizanSettings> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("platform_settings")
      .select("org_name, primary_color, accent_color, ecirs_connected, inherit_ecirs_theme")
      .eq("id", true)
      .maybeSingle();

    const rawPrimary = data?.primary_color;
    const rawAccent = data?.accent_color;
    const value: MizanSettings = {
      orgName: data?.org_name?.trim() || FALLBACK.orgName,
      primaryColor: HEX.test(rawPrimary ?? "") ? (rawPrimary as string) : FALLBACK.primaryColor,
      accentColor: HEX.test(rawAccent ?? "") ? (rawAccent as string) : FALLBACK.accentColor,
      ecirsConnected: !!data?.ecirs_connected,
      inheritEcirsTheme: !!data?.inherit_ecirs_theme,
    };
    cached = { at: Date.now(), value };
    return value;
  } catch {
    return FALLBACK; // never let a settings read stop a page
  }
}
