"use server";

import { getIdentity } from "@/lib/identity";
import { applyAsRunCsv } from "@/lib/reconcile-apply";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; message: string };

// Manual reconciliation: paste/upload a RadioBOSS as-run CSV and match it.
export async function reconcileUpload(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const stationId = String(formData.get("station_id") ?? "");
  const csv = String(formData.get("csv") ?? "");
  const markMisses = formData.get("mark_misses") === "on";
  if (!stationId) return { ok: false, message: "Choose a station." };
  if (!csv.trim()) return { ok: false, message: "Paste the log contents first." };

  const result = await applyAsRunCsv({ stationId, csv, source: "upload", markMissesForDates: markMisses });
  revalidatePath("/reconcile");
  revalidatePath("/air-log");
  return result;
}
