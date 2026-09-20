import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, PageHeader, Card, Badge, EmptyState, btn, btnQuiet } from "../../ui";
import { AddSegmentButton } from "./AddSegmentButton";
import { setCampaignStatus, createSegment, deleteSegment } from "./actions";

export const dynamic = "force-dynamic";

const DAY_KEYS: [string, string][] = [
  ["runs_mon", "Mon"], ["runs_tue", "Tue"], ["runs_wed", "Wed"], ["runs_thu", "Thu"],
  ["runs_fri", "Fri"], ["runs_sat", "Sat"], ["runs_sun", "Sun"],
];
function daysLabel(s: Record<string, unknown>): string {
  const on = DAY_KEYS.filter(([k]) => s[k]).map(([, l]) => l);
  if (on.length === 7) return "Every day";
  if (on.length === 5 && !s.runs_sat && !s.runs_sun) return "Mon–Fri";
  return on.join(", ");
}
const STATUS: Record<string, "neutral" | "brand" | "success" | "danger"> = {
  draft: "neutral", active: "brand", completed: "success", cancelled: "danger",
};

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: c } = await supabase
    .from("campaigns")
    .select("id, number, name, status, start_date, end_date, customer_id, station_id, competition_mode")
    .eq("id", params.id).maybeSingle();
  if (!c) notFound();

  // Names + this campaign's materials + its segments.
  const [{ data: cust }, { data: stn }, { data: campMaterials }, { data: segments }] = await Promise.all([
    supabase.from("customers").select("name").eq("id", c.customer_id).maybeSingle(),
    supabase.from("stations").select("code, name").eq("id", c.station_id).maybeSingle(),
    supabase.from("campaign_materials").select("materials ( id, name, duration_secs )").eq("campaign_id", c.id),
    supabase.from("segments").select("*").eq("campaign_id", c.id).order("start_date"),
  ]);

  const materials = (campMaterials ?? [])
    .map((r) => r.materials as never as { id: string; name: string; duration_secs: number })
    .filter(Boolean);

  const isDraft = c.status === "draft";

  return (
    <div>
      <PageHeader
        title={`#${c.number} · ${c.name}`}
        action={<Link href="/campaigns" className="text-sm text-brand hover:underline">← Campaigns</Link>}
      />

      {/* Summary + status controls */}
      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span><span className="text-neutral-500">Customer</span> <span className="text-ink font-medium">{cust?.name ?? "—"}</span></span>
            <span><span className="text-neutral-500">Station</span> <span className="font-mono">{stn?.code ?? "—"}</span></span>
            <span><span className="text-neutral-500">Runs</span> {c.start_date} → {c.end_date}</span>
            <Badge tone={STATUS[c.status] ?? "neutral"}>{c.status}</Badge>
          </div>
          <div className="flex items-center gap-3">
            {isDraft ? (
              <ActionForm action={setCampaignStatus} className="inline">
                <input type="hidden" name="campaign_id" value={c.id} />
                <input type="hidden" name="status" value="active" />
                <button className={btn}>Activate campaign</button>
              </ActionForm>
            ) : c.status === "active" ? (
              <ActionForm action={setCampaignStatus} className="inline">
                <input type="hidden" name="campaign_id" value={c.id} />
                <input type="hidden" name="status" value="draft" />
                <button className={btnQuiet}>Move back to draft</button>
              </ActionForm>
            ) : null}
          </div>
        </div>
        {isDraft && (
          <p className="mt-3 text-xs text-neutral-500">
            This campaign is a draft. Add its segments and generate the schedule, then activate it to run.
          </p>
        )}
      </Card>

      {/* Segments */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">
            Segments <span className="text-neutral-400 font-normal">({(segments ?? []).length})</span>
          </h2>
          {isDraft && (
            <AddSegmentButton campaignId={c.id} campaignStart={c.start_date} campaignEnd={c.end_date}
              materials={materials as never} action={createSegment} />
          )}
        </div>

        <div className="mt-4">
          {(segments ?? []).length === 0 ? (
            <EmptyState title="No segments yet"
              hint={isDraft ? "Add a segment to describe when and how often this campaign airs." : "This campaign has no segments."} />
          ) : (
            <div className="space-y-3">
              {(segments ?? []).map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                      <span className="font-medium text-ink">{s.name}</span>
                      <span className="text-neutral-500">{s.start_date} → {s.end_date}</span>
                      <span className="text-neutral-400">{daysLabel(s)}</span>
                      <span className="font-mono text-brand text-xs">{String(s.hour_from).slice(0,5)}–{String(s.hour_to).slice(0,5)}</span>
                      <Badge tone="accent">{s.plays_count} play{s.plays_count === 1 ? "" : "s"} {s.plays_basis === "per_day" ? "/ day" : "/ segment"}</Badge>
                    </div>
                    {isDraft && (
                      <ActionForm action={deleteSegment} className="inline">
                        <input type="hidden" name="segment_id" value={s.id} />
                        <input type="hidden" name="campaign_id" value={c.id} />
                        <button className="text-xs text-red-700 hover:underline">Remove</button>
                      </ActionForm>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule — comes in the next delivery */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-ink">Schedule</h2>
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-8 text-center">
          <p className="text-sm text-neutral-500">
            Generating the schedule — placing each play into a break — comes next.
            Add your segments first; then MIZAN can lay out the plays.
          </p>
        </div>
      </div>
    </div>
  );
}
