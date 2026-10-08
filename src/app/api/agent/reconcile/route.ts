import { NextResponse } from "next/server";
import { verifyAgentKey } from "@/lib/agent-auth";
import { applyAsRunCsv } from "@/lib/reconcile-apply";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await verifyAgentKey(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { station_id?: string; csv?: string; mark_misses?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const stationId = String(body.station_id ?? "");
  const csv = String(body.csv ?? "");
  if (!stationId) return NextResponse.json({ error: "station_id required" }, { status: 400 });
  if (!csv) return NextResponse.json({ error: "csv required" }, { status: 400 });

  const result = await applyAsRunCsv({ stationId, csv, source: "agent", markMissesForDates: !!body.mark_misses });
  return NextResponse.json(result);
}
