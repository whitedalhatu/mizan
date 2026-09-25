import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "../certificate/PrintButton";

export const dynamic = "force-dynamic";

const naira = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
function ngn(n: number) { return "₦" + naira.format(Math.round(n)); }

export default async function ValueSummaryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { orgName } = await getSettings();

  const { data: c } = await supabase
    .from("campaigns")
    .select("id, number, name, start_date, end_date, customer_id, station_id, spot_rate, ecirs_contract_id")
    .eq("id", params.id).maybeSingle();
  if (!c) notFound();

  const [{ data: cust }, { data: stn }] = await Promise.all([
    supabase.from("customers").select("name, standing_spot_rate").eq("id", c.customer_id).maybeSingle(),
    supabase.from("stations").select("code, name").eq("id", c.station_id).maybeSingle(),
  ]);

  // Rate: campaign's own (from the ECIRS contract) takes precedence, else the
  // customer's standing rate (agency bill-after).
  const rate = c.spot_rate != null ? Number(c.spot_rate)
    : (cust?.standing_spot_rate != null ? Number(cust.standing_spot_rate) : null);
  const rateSource = c.spot_rate != null ? "from the ECIRS contract"
    : (cust?.standing_spot_rate != null ? "customer standing rate" : null);

  const { data: plays } = await supabase
    .from("scheduled_plays")
    .select("id, material_id, air_state")
    .eq("campaign_id", c.id);
  const rows = plays ?? [];

  const plannedPlays = rows.length;
  const airedPlays = rows.filter((p) => p.air_state === "aired").length;
  const missedPlays = rows.filter((p) => p.air_state === "missed").length;
  const upcomingPlays = rows.filter((p) => p.air_state === "scheduled").length;

  const plannedValue = rate != null ? rate * plannedPlays : null;
  const airedValue = rate != null ? rate * airedPlays : null;
  const upcomingValue = rate != null ? rate * upcomingPlays : null;

  return (
    <div className="cob-root">
      <div className="no-print mb-4 flex items-center justify-between">
        <a href={`/campaigns/${c.id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-ink transition-colors">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to campaign
        </a>
        <PrintButton />
      </div>

      <div className="cob-doc">
        <div className="text-center mb-6">
          <p className="text-xs tracking-[0.25em] text-neutral-500 uppercase">{orgName}</p>
          <h1 className="text-xl font-bold mt-1">Value summary</h1>
        </div>

        <div className="text-sm space-y-0.5 mb-5">
          <p><strong>Station:</strong> {stn?.name ?? "—"}{stn?.code ? ` (${stn.code})` : ""}</p>
          <p><strong>Customer:</strong> {cust?.name ?? "—"}</p>
          <p><strong>Campaign:</strong> {c.name} <span className="font-mono text-neutral-500">#{c.number}</span></p>
          <p className="mt-1"><strong>Period:</strong> {c.start_date} → {c.end_date}</p>
        </div>

        {rate == null ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No spot rate is set for this campaign. Bring it in from an ECIRS contract, or set a standing rate on the customer, to see values.
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-600 mb-3">Unit price: <strong>{ngn(rate)}</strong> per spot <span className="text-neutral-400">({rateSource})</span></p>

            <table className="w-full text-sm border-t border-neutral-200">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Spots</th>
                  <th className="py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-2">Aired (played)</td>
                  <td className="py-2 text-right font-mono">{airedPlays}</td>
                  <td className="py-2 text-right font-mono">{ngn(airedValue!)}</td>
                </tr>
                <tr>
                  <td className="py-2">Upcoming (still to air)</td>
                  <td className="py-2 text-right font-mono">{upcomingPlays}</td>
                  <td className="py-2 text-right font-mono text-neutral-500">{ngn(upcomingValue!)}</td>
                </tr>
                {missedPlays > 0 && (
                  <tr>
                    <td className="py-2 text-red-700">Missed (did not air)</td>
                    <td className="py-2 text-right font-mono text-red-700">{missedPlays}</td>
                    <td className="py-2 text-right font-mono text-red-700">{ngn(rate * missedPlays)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-300">
                  <td className="py-2.5 font-semibold">Earned so far (aired)</td>
                  <td className="py-2.5 text-right font-mono font-semibold">{airedPlays}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-base">{ngn(airedValue!)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-500">Full campaign (all planned)</td>
                  <td className="py-1 text-right font-mono text-neutral-500">{plannedPlays}</td>
                  <td className="py-1 text-right font-mono text-neutral-500">{ngn(plannedValue!)}</td>
                </tr>
              </tfoot>
            </table>

            <p className="mt-5 text-xs text-neutral-500">
              For agency campaigns billed on what aired, the amount to invoice is the <strong>Earned so far</strong> figure — {ngn(airedValue!)} for {airedPlays} spots at {ngn(rate)} each.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
