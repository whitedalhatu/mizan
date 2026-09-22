import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// The MIZAN side of the adapter — calls ECIRS's /api/mizan/* endpoints with the
// shared key from settings. Read-only helpers plus the airing-proof push.

async function connection(): Promise<{ url: string; key: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_settings")
    .select("ecirs_url, ecirs_api_key, ecirs_connected")
    .eq("id", true)
    .maybeSingle();
  if (!data?.ecirs_url || !data?.ecirs_api_key) return null;
  return { url: String(data.ecirs_url).replace(/\/+$/, ""), key: String(data.ecirs_api_key) };
}

export type EcirsClient = {
  id: string; legal_name: string; type: string;
  station_code: string | null; category_name: string | null;
};
export type EcirsContractLine = {
  product_label: string | null; description: string | null;
  spot_length_secs: number | null; spots_per_day: number | null;
  days: number | null; quantity: number | null; unit_rate: number | null;
};
export type EcirsContract = {
  id: string; campaign_name: string; start_date: string; end_date: string;
  status: string; station_code: string | null; net_value: number;
  lines: EcirsContractLine[];
};

async function callEcirs(path: string, init?: RequestInit): Promise<Response | null> {
  const conn = await connection();
  if (!conn) return null;
  try {
    return await fetch(conn.url + path, {
      ...init,
      headers: { ...(init?.headers ?? {}), "x-mizan-key": conn.key, "content-type": "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

// Verify the connection is live and the key is accepted.
export async function testEcirsConnection(): Promise<{ ok: boolean; message: string }> {
  const conn = await connection();
  if (!conn) return { ok: false, message: "Enter the ECIRS address and key first." };
  const res = await callEcirs("/api/mizan/clients");
  if (!res) return { ok: false, message: "Couldn't reach ECIRS at that address." };
  if (res.status === 401) return { ok: false, message: "ECIRS rejected the key — check it's correct and the connection is enabled in ECIRS." };
  if (!res.ok) return { ok: false, message: `ECIRS returned an error (${res.status}).` };
  return { ok: true, message: "Connected to ECIRS." };
}

export async function fetchEcirsClients(): Promise<EcirsClient[] | null> {
  const res = await callEcirs("/api/mizan/clients");
  if (!res || !res.ok) return null;
  const body = await res.json().catch(() => null);
  return (body?.clients ?? null) as EcirsClient[] | null;
}

export async function fetchEcirsClientContracts(ecirsClientId: string): Promise<EcirsContract[] | null> {
  const res = await callEcirs(`/api/mizan/clients/${ecirsClientId}/contracts`);
  if (!res || !res.ok) return null;
  const body = await res.json().catch(() => null);
  return (body?.contracts ?? null) as EcirsContract[] | null;
}

export async function pushAiringProof(payload: {
  ecirs_contract_id: string;
  aired_plays: number; planned_plays: number;
  aired_seconds: number; planned_seconds: number;
  aired_value?: number | null;
}): Promise<{ ok: boolean; message: string }> {
  const res = await callEcirs("/api/mizan/airings", { method: "POST", body: JSON.stringify(payload) });
  if (!res) return { ok: false, message: "Couldn't reach ECIRS." };
  if (res.status === 401) return { ok: false, message: "ECIRS rejected the key." };
  if (!res.ok) return { ok: false, message: `ECIRS returned an error (${res.status}).` };
  return { ok: true, message: "Airing proof sent to ECIRS." };
}
