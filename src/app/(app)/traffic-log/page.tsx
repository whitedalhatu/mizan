import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, EmptyState, Select } from "../ui";

export const dynamic = "force-dynamic";

function hm(t: string | null) { return t ? String(t).slice(0, 5) : "—"; }
function secsFmt(s: number) { const m = Math.floor(s / 60), sec = s % 60; return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; }

const DAY_KEY = ["runs_sun", "runs_mon", "runs_tue", "runs_wed", "runs_thu", "runs_fri", "runs_sat"];

export default async function TrafficLogPage({
  searchParams,
}: { searchParams: { st?: string; date?: string } }) {
  const supabase = createClient();
  const { data: stations } = await supabase.from("stations").select("id, code, name").eq("active", true).order("code");

  const today = new Date().toISOString().slice(0, 10);
  const date = searchParams.date || today;
  // Default to the first station if none chosen.
  const stationId = searchParams.st || (stations ?? [])[0]?.id || "";

  if (!stationId) {
    return (
      <div>
        <PageHeader title="Traffic log" description="The day's breaks for a station, with every ad scheduled in each." />
        <div className="mt-6"><EmptyState title="No stations yet" hint="Add a station first." /></div>
      </div>
    );
  }

  // Breaks on this station that run this weekday.
  const weekdayKey = DAY_KEY[new Date(date + "T00:00:00").getDay()];
  const { data: allBreaks } = await supabase
    .from("commercial_breaks")
    .select("id, name, start_time, duration_secs, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat, runs_sun")
    .eq("station_id", stationId).eq("active", true)
    .order("start_time");
  const breaks = (allBreaks ?? []).filter((b) => (b as never as Record<string, boolean>)[weekdayKey]);

  // Scheduled plays on this station's breaks for this date.
  const breakIds = breaks.map((b) => b.id);
  const { data: plays } = breakIds.length
    ? await supabase
        .from("scheduled_plays")
        .select("id, break_id, material_id, campaign_id, air_state, shifted, actual_time")
        .eq("play_date", date).in("break_id", breakIds)
    : { data: [] as Record<string, unknown>[] };

  // Name lookups.
  const { data: allMats } = await supabase.from("materials").select("id, name, duration_secs");
  const { data: allCamps } = await supabase.from("campaigns").select("id, number, name, customer_id");
  const { data: allCust } = await supabase.from("customers").select("id, name");
  const matById = new Map<string, { id: string; name: string; duration_secs: number }>((allMats ?? []).map((m) => [m.id, m]));
  const campById = new Map<string, { id: string; number: number; name: string; customer_id: string }>((allCamps ?? []).map((c) => [c.id, c]));
  const custName = new Map<string, string>((allCust ?? []).map((c) => [c.id, c.name]));

  // Group plays by break.
  const playsByBreak = new Map<string, typeof plays>();
  (plays ?? []).forEach((p) => {
    const arr = playsByBreak.get(p.break_id as string) ?? [];
    arr!.push(p); playsByBreak.set(p.break_id as string, arr);
  });

  return (
    <div>
      <PageHeader
        title="Traffic log"
        description="The day's breaks for a station, with every ad scheduled in each — across all campaigns."
      />

      <form className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-3.5">
        <label className="block">
          <span className="text-xs text-neutral-500">Station</span>
          <div className="mt-0.5">
            <Select name="st" defaultValue={stationId} className="!py-1.5 text-sm">
              {(stations ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </Select>
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Date</span>
          <input name="date" type="date" defaultValue={date} className="mt-0.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm bg-white" />
        </label>
        <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-deep">Show</button>
      </form>

      <div className="mt-6">
        {breaks.length === 0 ? (
          <EmptyState title="No breaks that day" hint="This station has no breaks running on this weekday." />
        ) : (
          <div className="space-y-4">
            {breaks.map((b) => {
              const items = playsByBreak.get(b.id) ?? [];
              const usedSecs = (items ?? []).reduce((s, p) => s + (matById.get(p.material_id as string)?.duration_secs ?? 0), 0);
              return (
                <Card key={b.id} className="overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-brand font-semibold">{hm(b.start_time)}</span>
                      <span className="font-medium text-ink">{b.name}</span>
                      <span className="text-xs text-neutral-500">{Math.round(b.duration_secs / 60)} min break</span>
                    </div>
                    <span className="text-xs text-neutral-500 font-mono">
                      {secsFmt(usedSecs)} / {secsFmt(b.duration_secs)} used · {(items ?? []).length} spot{(items ?? []).length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {(items ?? []).length === 0 ? (
                    <p className="px-4 py-3 text-sm text-neutral-400">No ads scheduled in this break.</p>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {(items ?? []).map((p, i) => {
                        const mat = matById.get(p.material_id as string);
                        const camp = campById.get(p.campaign_id as string);
                        const missed = p.air_state === "missed";
                        return (
                          <div key={p.id as string} className={`flex items-center gap-3 px-4 py-2 text-sm ${missed ? "bg-red-50" : ""}`}>
                            <span className="text-xs text-neutral-400 w-6">{String(i + 1).padStart(2, "0")}</span>
                            <span className={`font-mono text-xs w-14 ${missed ? "text-red-700 line-through" : "text-neutral-500"}`}>{mat ? secsFmt(mat.duration_secs) : "—"}</span>
                            <span className={missed ? "text-red-700 line-through" : "text-ink"}>{mat?.name ?? "—"}</span>
                            <span className="text-xs text-neutral-400">
                              {camp ? <>{custName.get(camp.customer_id) ?? ""} · <span className="font-mono">{camp.number}</span></> : ""}
                            </span>
                            <span className="ml-auto flex items-center gap-2">
                              {p.air_state === "aired" && <Badge tone="success">aired</Badge>}
                              {missed && <Badge tone="danger">missed</Badge>}
                              {p.shifted && <Badge tone="warning">shifted</Badge>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
