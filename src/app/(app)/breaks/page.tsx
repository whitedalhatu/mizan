import { createClient } from "@/lib/supabase/server";
import { ActionForm, PageHeader, Card, EmptyState } from "../ui";
import { NewBreakButton } from "./NewBreakButton";
import { createBreak, deleteBreak, updateBreak } from "./actions";
import { EditBreakButton } from "./EditBreakButton";

const DAY_KEYS: [string, string][] = [
  ["runs_mon", "Mon"], ["runs_tue", "Tue"], ["runs_wed", "Wed"], ["runs_thu", "Thu"],
  ["runs_fri", "Fri"], ["runs_sat", "Sat"], ["runs_sun", "Sun"],
];
function daysLabel(b: Record<string, unknown>): string {
  const on = DAY_KEYS.filter(([k]) => b[k]).map(([, l]) => l);
  if (on.length === 7) return "Every day";
  if (on.length === 5 && !b.runs_sat && !b.runs_sun) return "Mon\u2013Fri";
  return on.join(", ");
}

export const dynamic = "force-dynamic";

export default async function BreaksPage() {
  const supabase = createClient();
  const { data: stations } = await supabase.from("stations").select("id, code, name").eq("active", true).order("code");
  const { data: breaks } = await supabase
    .from("commercial_breaks")
    .select("id, name, start_time, duration_secs, station_id, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat, runs_sun, stations ( code )")
    .order("start_time");

  return (
    <div>
      <PageHeader
        title="Commercial breaks"
        description="Build the day's breaks by hand — when each break airs, how long it is, and which days it runs. Later, campaign spots are placed into these."
        action={<NewBreakButton stations={(stations ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name }))} action={createBreak} />}
      />

      <div className="mt-6">
        {!breaks || breaks.length === 0 ? (
          <EmptyState title="No breaks yet" hint="Add the first one." />
        ) : (
          <Card className="divide-y divide-neutral-100">
            {breaks.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 flex-wrap px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-semibold text-brand">{String(b.start_time).slice(0, 5)}</span>
                  <span className="font-medium text-ink">{b.name}</span>
                  <span className="text-xs font-mono text-neutral-500">{(b.stations as never as { code: string })?.code}</span>
                  <span className="text-sm text-neutral-500">{Math.round(b.duration_secs / 60)} min</span>
                  <span className="text-xs text-neutral-400">{daysLabel(b as never)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <EditBreakButton brk={b as never} action={updateBreak} />
                  <ActionForm action={deleteBreak} className="inline">
                    <input type="hidden" name="id" value={b.id} />
                    <button className="text-sm text-red-700 hover:underline">Delete</button>
                  </ActionForm>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
