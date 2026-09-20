import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, EmptyState, Select } from "../ui";

export const dynamic = "force-dynamic";

function fmtTime(t: string | null) { return t ? String(t).slice(0, 5) : "—"; }

export default async function AirLogPage({
  searchParams,
}: { searchParams: { from?: string; to?: string; st?: string; state?: string } }) {
  const supabase = createClient();

  // Default range: last 30 days to today.
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const from = searchParams.from || monthAgo;
  const to = searchParams.to || today;

  const { data: stations } = await supabase.from("stations").select("id, code, name").order("code");

  // Pull plays in range, plainly (no embedded joins — resolve names via maps).
  let q = supabase
    .from("scheduled_plays")
    .select("id, play_date, actual_time, break_id, material_id, campaign_id, shifted, air_state")
    .gte("play_date", from).lte("play_date", to)
    .order("play_date", { ascending: false }).order("actual_time");
  if (searchParams.state && ["scheduled", "aired", "missed"].includes(searchParams.state)) {
    q = q.eq("air_state", searchParams.state);
  }
  const { data: plays } = await q;

  // Resolve names.
  const { data: allMats } = await supabase.from("materials").select("id, name");
  const { data: allBrks } = await supabase.from("commercial_breaks").select("id, name");
  const { data: allCamps } = await supabase.from("campaigns").select("id, number, name, customer_id, station_id");
  const { data: allCust } = await supabase.from("customers").select("id, name");

  const matName = new Map<string, string>((allMats ?? []).map((m) => [m.id, m.name]));
  const brkName = new Map<string, string>((allBrks ?? []).map((b) => [b.id, b.name]));
  const custName = new Map<string, string>((allCust ?? []).map((c) => [c.id, c.name]));
  const campById = new Map<string, { number: number; name: string; customer_id: string; station_id: string }>(
    (allCamps ?? []).map((c) => [c.id, { number: c.number, name: c.name, customer_id: c.customer_id, station_id: c.station_id }])
  );

  // Station filter (by campaign's station).
  let rows = plays ?? [];
  if (searchParams.st) rows = rows.filter((p) => campById.get(p.campaign_id)?.station_id === searchParams.st);

  const stnCode = new Map<string, string>((stations ?? []).map((s) => [s.id, s.code]));

  return (
    <div>
      <PageHeader
        title="Air log"
        description="Every advert placed in the schedule across all campaigns. Aired, upcoming, missed and shifted plays for any date range."
      />

      <form className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3.5">
        <label className="block">
          <span className="text-xs text-neutral-500">From</span>
          <input name="from" type="date" defaultValue={from} className="mt-0.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm bg-white" />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">To</span>
          <input name="to" type="date" defaultValue={to} className="mt-0.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm bg-white" />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Station</span>
          <div className="mt-0.5">
            <Select name="st" defaultValue={searchParams.st ?? ""} className="!py-1.5 text-sm">
              <option value="">All stations</option>
              {(stations ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </Select>
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">State</span>
          <div className="mt-0.5">
            <Select name="state" defaultValue={searchParams.state ?? ""} className="!py-1.5 text-sm">
              <option value="">Any</option>
              <option value="aired">Aired</option>
              <option value="scheduled">Upcoming</option>
              <option value="missed">Missed</option>
            </Select>
          </div>
        </label>
        <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-deep">Filter</button>
      </form>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No plays in this range" hint="Widen the date range or clear the filters." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-neutral-500 border-b border-neutral-200">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Stn</th>
                    <th className="px-4 py-2.5">Campaign</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Material</th>
                    <th className="px-4 py-2.5">Break</th>
                    <th className="px-4 py-2.5">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((p) => {
                    const camp = campById.get(p.campaign_id);
                    const missed = p.air_state === "missed";
                    return (
                      <tr key={p.id} className={missed ? "bg-red-50" : p.shifted ? "bg-amber-50/50" : ""}>
                        <td className="px-4 py-2.5 whitespace-nowrap">{p.play_date}</td>
                        <td className={`px-4 py-2.5 font-mono ${missed ? "text-red-700 line-through" : p.shifted ? "text-amber-700" : "text-brand"}`}>{fmtTime(p.actual_time)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{camp ? stnCode.get(camp.station_id) ?? "—" : "—"}</td>
                        <td className="px-4 py-2.5">{camp ? <span><span className="font-mono text-brand">{camp.number}</span> {camp.name}</span> : "—"}</td>
                        <td className="px-4 py-2.5 text-neutral-600">{camp ? custName.get(camp.customer_id) ?? "—" : "—"}</td>
                        <td className={`px-4 py-2.5 ${missed ? "line-through text-red-700" : "text-ink"}`}>{matName.get(p.material_id) ?? "—"}</td>
                        <td className="px-4 py-2.5 text-neutral-400 text-xs">{p.break_id ? brkName.get(p.break_id) ?? "" : "unplaced"}</td>
                        <td className="px-4 py-2.5">
                          {p.air_state === "aired" && <Badge tone="success">aired</Badge>}
                          {p.air_state === "scheduled" && <Badge tone="neutral">upcoming</Badge>}
                          {missed && <Badge tone="danger">missed</Badge>}
                          {p.shifted && <span className="ml-1"><Badge tone="warning">shifted</Badge></span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="mt-3 text-xs text-neutral-400">{rows.length} play{rows.length === 1 ? "" : "s"} shown.</p>
      </div>
    </div>
  );
}
