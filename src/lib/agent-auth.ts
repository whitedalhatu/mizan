import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Verifies the X-MIZAN-AGENT-KEY header for station-agent calls.
export async function verifyAgentKey(request: Request): Promise<boolean> {
  const presented = request.headers.get("x-mizan-agent-key");
  if (!presented) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_settings").select("agent_key, agent_enabled").eq("id", true).maybeSingle();
  if (!data || !data.agent_enabled || !data.agent_key) return false;
  const a = presented, b = data.agent_key as string;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
