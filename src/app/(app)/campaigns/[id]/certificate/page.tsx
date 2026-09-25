import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

function hm(t: string | null) { return t ? String(t).slice(0, 5) : "—"; }
function to12h(t: string | null) {
  if (!t) return "—";
  const [h, m] = String(t).slice(0, 5).split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM"; const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { orgName } = await getSettings();

  const { data: c } = await supabase
    .from("campaigns")
    .select("id, number, name, start_date, end_date, customer_id, station_id")
    .eq("id", params.id).maybeSingle();
  if (!c) notFound();

  const [{ data: cust }, { data: stn }] = await Promise.all([
    supabase.from("customers").select("name").eq("id", c.customer_id).maybeSingle(),
    supabase.from("stations").select("code, name").eq("id", c.station_id).maybeSingle(),
  ]);

  const { data: plays } = await supabase
    .from("scheduled_plays")
    .select("id, play_date, actual_time, material_id, air_state, shifted")
    .eq("campaign_id", c.id)
    .order("play_date").order("actual_time");

  const { data: mats } = await supabase.from("materials").select("id, name, duration_secs");
  const matById = new Map<string, { name: string; duration_secs: number }>((mats ?? []).map((m) => [m.id, m]));

  type Play = { id: string; play_date: string; actual_time: string | null; material_id: string; air_state: string; shifted: boolean };
  const rows = (plays ?? []) as never as Play[];
  // Distinct materials in this campaign, for the "spots in this report" list.
  const spotIds: string[] = Array.from(new Set(rows.map((p) => p.material_id)));

  const today = new Date().toISOString().slice(0, 10);
  const aired = rows.filter((p) => p.air_state === "aired");
  const missed = rows.filter((p) => p.air_state === "missed");
  const plannedPlays = rows.length;
  const airedPlays = aired.length;
  const plannedSeconds = rows.reduce((s, p) => s + (matById.get(p.material_id)?.duration_secs ?? 0), 0);
  const airedSeconds = aired.reduce((s, p) => s + (matById.get(p.material_id)?.duration_secs ?? 0), 0);
  const playsPct = plannedPlays ? Math.round((airedPlays / plannedPlays) * 100) : 0;
  const secsPct = plannedSeconds ? Math.round((airedSeconds / plannedSeconds) * 100) : 0;

  // Section 1: aired or missed (i.e. already reconciled or past). We treat rows
  // with air_state aired/missed as "exact", and scheduled (future) as "expected".
  const exact = rows.filter((p) => p.air_state === "aired" || p.air_state === "missed");
  const expected = rows.filter((p) => p.air_state === "scheduled");

  return (
    <div className="cob-root">
      {/* Print controls (hidden when printing) */}
      <div className="no-print mb-4 flex items-center justify-between">
        <a href={`/campaigns/${c.id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-ink transition-colors">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to campaign
        </a>
        <PrintButton />
      </div>

      <div className="cob-doc">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs tracking-[0.25em] text-neutral-500 uppercase">{orgName}</p>
          <h1 className="text-xl font-bold mt-1">Certificate of Broadcast</h1>
        </div>

        <div className="text-sm space-y-0.5 mb-4">
          <p><strong>Station:</strong> {stn?.name ?? "—"}{stn?.code ? ` (${stn.code})` : ""}</p>
          <p><strong>Customer:</strong> {cust?.name ?? "—"}</p>
          <p><strong>Order / Campaign:</strong> {c.name} <span className="font-mono text-neutral-500">#{c.number}</span></p>
          <p className="mt-1"><strong>Starting date:</strong> {c.start_date} &nbsp;|&nbsp; <strong>Ending date:</strong> {c.end_date}</p>
        </div>

        {/* Progress bars */}
        <div className="space-y-2 mb-4">
          <Bar label={`${airedPlays} / ${plannedPlays} plays`} pct={playsPct} />
          <Bar label={`${airedSeconds} / ${plannedSeconds} seconds`} pct={secsPct} />
        </div>

        <p className="text-xs text-neutral-500 mb-4">
          Generated {today}. Reflects the airing record up to now. Times shown in red with a strikethrough
          are scheduled spots recorded as not aired. Reload to update.
        </p>

        {/* Spots in this report */}
        <div className="mb-4 text-sm">
          <p className="font-semibold">Spots in this report:</p>
          <ol className="list-decimal ml-6">
            {spotIds.map((id) => {
              const m = matById.get(id);
              return <li key={id}>{m ? `${Math.floor(m.duration_secs/60)}:${String(m.duration_secs%60).padStart(2,"0")} ${m.name}` : id}</li>;
            })}
          </ol>
        </div>

        {/* Section 1 — Exact broadcast times */}
        <div className="mb-4">
          <p className="font-semibold text-sm">Section 1: Exact broadcast times</p>
          <p className="text-xs italic text-neutral-500 mb-1">
            The actual broadcast record. A time in red with a strikethrough means the scheduled spot was recorded as not aired.
          </p>
          {exact.length === 0 ? (
            <p className="text-sm text-neutral-400">Nothing recorded as aired or missed yet.</p>
          ) : (
            <table className="text-sm w-full max-w-md">
              <tbody>
                {exact.map((p) => {
                  const isMissed = p.air_state === "missed";
                  return (
                    <tr key={p.id}>
                      <td className="py-0.5 pr-6">{p.play_date}</td>
                      <td className={`py-0.5 font-mono ${isMissed ? "text-red-600 line-through" : ""}`}>{to12h(p.actual_time)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2 — Expected broadcast times */}
        <div className="mb-4">
          <p className="font-semibold text-sm">Section 2: Expected broadcast times</p>
          <p className="text-xs italic text-neutral-500 mb-1">
            The planned schedule still to come. May be re-generated to optimise the campaign; the number of plays will always be respected.
          </p>
          {expected.length === 0 ? (
            <p className="text-sm text-neutral-400">No further plays scheduled.</p>
          ) : (
            <table className="text-sm w-full max-w-md">
              <tbody>
                {expected.map((p) => (
                  <tr key={p.id}>
                    <td className="py-0.5 pr-6">{p.play_date}</td>
                    <td className="py-0.5 font-mono">{to12h(p.actual_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="relative h-6 rounded bg-neutral-200 overflow-hidden">
      <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-ink">
        {pct}% ({label})
      </div>
    </div>
  );
}
