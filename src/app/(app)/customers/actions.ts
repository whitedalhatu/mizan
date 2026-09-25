"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchEcirsClients, fetchEcirsClientContracts } from "@/lib/ecirs";

type Result = { ok: boolean; message: string };

export async function createCustomer(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  if (!name) return { ok: false, message: "Customer name is required." };

  const supabase = createClient();
  const { error } = await supabase.from("customers").insert({
    name, category_id: categoryId || null,
    contact_name: contactName || null, contact_phone: contactPhone || null,
    source: "mizan",
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: false, message: `"${name}" already exists.` };
    return { ok: false, message: error.message };
  }
  revalidatePath("/customers");
  return { ok: true, message: `Customer "${name}" added.` };
}

export async function deleteCustomer(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing customer." };
  const supabase = createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    if (/foreign key|violates/i.test(error.message))
      return { ok: false, message: "This customer has campaigns — remove those first." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/customers");
  return { ok: true, message: "Customer removed." };
}

// --- ECIRS sync: pull all ECIRS clients into MIZAN customers ---

export async function syncEcirsClients(): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const clients = await fetchEcirsClients();
  if (clients === null) return { ok: false, message: "Couldn't reach ECIRS — check the connection in Settings." };

  const supabase = createClient();
  // Existing MIZAN customers, by ecirs id and by lowercased name (for matching).
  const { data: existing } = await supabase.from("customers").select("id, name, ecirs_client_id");
  const byEcirsId = new Map<string, string>();
  const byName = new Map<string, string>();
  (existing ?? []).forEach((c) => {
    if (c.ecirs_client_id) byEcirsId.set(c.ecirs_client_id, c.id);
    byName.set(c.name.toLowerCase(), c.id);
  });

  let created = 0, linked = 0;
  for (const cl of clients) {
    if (byEcirsId.has(cl.id)) continue; // already linked
    const existingByName = byName.get(cl.legal_name.toLowerCase());
    if (existingByName) {
      // Link the existing customer to this ECIRS client.
      await supabase.from("customers").update({ ecirs_client_id: cl.id, source: "ecirs" }).eq("id", existingByName);
      linked++;
    } else {
      await supabase.from("customers").insert({
        name: cl.legal_name, source: "ecirs", ecirs_client_id: cl.id,
      });
      created++;
    }
  }
  revalidatePath("/customers");
  return { ok: true, message: `Synced from ECIRS — ${created} added, ${linked} linked.` };
}

// --- Bring an ECIRS contract in as a MIZAN campaign ---
export async function importContractAsCampaign(formData: FormData): Promise<Result & { id?: string }> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };

  const customerId = String(formData.get("customer_id") ?? "");
  const ecirsClientId = String(formData.get("ecirs_client_id") ?? "");
  const ecirsContractId = String(formData.get("ecirs_contract_id") ?? "");
  const stationId = String(formData.get("station_id") ?? "");
  if (!customerId || !ecirsClientId || !ecirsContractId) return { ok: false, message: "Missing details." };
  if (!stationId) return { ok: false, message: "Pick which MIZAN station this runs on." };

  // Re-fetch the contract from ECIRS (authoritative).
  const contracts = await fetchEcirsClientContracts(ecirsClientId);
  if (contracts === null) return { ok: false, message: "Couldn't reach ECIRS." };
  const contract = contracts.find((c) => c.id === ecirsContractId);
  if (!contract) return { ok: false, message: "That contract is no longer available from ECIRS." };

  const supabase = createClient();

  // Avoid duplicate import.
  const { data: dupe } = await supabase.from("campaigns").select("id").eq("ecirs_contract_id", ecirsContractId).maybeSingle();
  if (dupe) return { ok: false, message: "This contract has already been brought in.", id: dupe.id };

  // Per-spot rate: take the first line's unit_rate (contracts usually price a
  // single spot product; refine later if multi-line pricing matters).
  const firstRate = contract.lines.find((l) => l.unit_rate != null)?.unit_rate ?? null;

  const { data: created, error } = await supabase.from("campaigns").insert({
    name: contract.campaign_name,
    customer_id: customerId,
    station_id: stationId,
    start_date: contract.start_date,
    end_date: contract.end_date,
    competition_mode: "auto",
    status: "draft",
    ecirs_contract_id: ecirsContractId,
    spot_rate: firstRate,
  }).select("id, number").single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/customers");
  revalidatePath("/campaigns");
  return { ok: true, message: `Campaign ${created.number} created from the contract. Add materials and set the hours, then generate the schedule.`, id: created.id };
}

// --- Edit a customer's details ---
export async function updateCustomer(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const standingRateRaw = String(formData.get("standing_spot_rate") ?? "").trim();

  if (!id) return { ok: false, message: "Missing customer." };
  if (!name) return { ok: false, message: "Name is required." };

  const supabase = createClient();
  const update: Record<string, unknown> = {
    name,
    category_id: categoryId || null,
    contact_name: contactName || null,
    contact_phone: contactPhone || null,
  };
  // Standing per-spot rate (for agency bill-after campaigns). Blank clears it.
  update.standing_spot_rate = standingRateRaw ? Number(standingRateRaw) : null;

  const { error } = await supabase.from("customers").update(update).eq("id", id);
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: false, message: `"${name}" already exists.` };
    return { ok: false, message: error.message };
  }
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer updated." };
}
