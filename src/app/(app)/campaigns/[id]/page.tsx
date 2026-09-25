import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, DetailHeader, Card, Badge, EmptyState, btn, btnQuiet } from "../../ui";
import { AddSegmentButton } from "./AddSegmentButton";
import { AddMaterialButton } from "./AddMaterialButton";
import { setCampaignStatus, createSegment, deleteSegment, generateSchedule, updateCampaign, updateSegment, setPlayAirState, sendAiringProof, addCampaignMaterial, removeCampaignMaterial } from "./actions";
import { EditCampaignButton } from "./EditCampaignButton";
import { EditSegmentButton } from "./EditSegmentButton";

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
    .select("id, number, name, status, start_date, end_date, customer_id, station_id, competition_mode, ecirs_contract_id, spot_rate")
    .eq("id", params.id).maybeSingle();
  if (!c) notFound();

  // Names + this campaign's materials + its segments.
  const [{ data: cust }, { data: stn }, { data: campMaterials }, { data: segments }] = await Promise.all([
    supabase.from("customers").select("name").eq("id", c.customer_id).maybeSingle(),
    supabase.from("stations").select("code, name").eq("id", c.station_id).maybeSingle(),
    supabase.from("campaign_materials").select("materials ( id, name, duration_secs )").eq("campaign_id", c.id),
    supabase.from("segments").select("*").eq("campaign_id", c.id).order("start_date"),
  ]);

  const [{ data: allCustomers }, { data: allStations }] = await Promise.all([
    supabase.from("customers").select("id, name, customer_categories ( name )").eq("active", true).order("name"),
    supabase.from("stations").select("id, code, name").eq("active", true).order("code"),
  ]);
  const customerOpts = (allCustomers ?? []).map((cu) => ({
    id: cu.id, name: cu.name, category: (cu.customer_categories as never as { name: string })?.name ?? null,
  }));

  const { data: plays } = await supabase
    .from("scheduled_plays")
    .select("id, play_date, actual_time, intended_from, intended_to, break_id, material_id, shifted, shift_reason, air_state, aired_at")
    .eq("campaign_id", c.id)
    .order("play_date").order("actual_time");

  // Lookups for names shown in the schedule.
  const { data: allMats } = await supabase.from("materials").select("id, name");
  const { data: allBrks } = await supabase.from("commercial_breaks").select("id, name");
  const matName = new Map<string, string>((allMats ?? []).map((m) => [m.id, m.name]));
  const brkName = new Map<string, string>((allBrks ?? []).map((b) => [b.id, b.name]));

  // Group plays by date.
  const byDate = new Map<string, typeof plays>();
  (plays ?? []).forEach((p) => {
    const arr = byDate.get(p.play_date) ?? [];
    arr!.push(p); byDate.set(p.play_date, arr);
  });
  const shiftedCount = (plays ?? []).filter((p) => p.shifted).length;
  const airedCount = (plays ?? []).filter((p) => p.air_state === "aired").length;
  const missedCount = (plays ?? []).filter((p) => p.air_state === "missed").length;
  const upcomingCount = (plays ?? []).filter((p) => p.air_state === "scheduled").length;

  const materials = (campMaterials ?? [])
    .map((r) => r.materials as never as { id: string; name: string; duration_secs: number })
    .filter(Boolean);

  // Full library, and which aren't yet on this campaign (for the picker).
  const { data: allLibrary } = await supabase.from("materials").select("id, name, duration_secs").order("created_at", { ascending: false });
  const attachedIds = new Set(materials.map((m) => m.id));
  const availableMaterials = (allLibrary ?? []).filter((m) => !attachedIds.has(m.id));

  // Each segment's chosen material ids (for the edit form).
  const segIds = (segments ?? []).map((s) => s.id);
  const { data: segMatRows } = segIds.length
    ? await supabase.from("segment_materials").select("segment_id, material_id, position").in("segment_id", segIds)
    : { data: [] as { segment_id: string; material_id: string; position: number }[] };
  const segMaterialIds = new Map<string, string[]>();
  (segMatRows ?? []).sort((a, b) => a.position - b.position).forEach((r) => {
    const arr = segMaterialIds.get(r.segment_id) ?? [];
    arr.push(r.material_id); segMaterialIds.set(r.segment_id, arr);
  });

  const isDraft = c.status === "draft";

  return (
    <div>
      <DetailHeader
        backHref="/campaigns"
        backLabel="Campaigns"
        title={`#${c.number} · ${c.name}`}
        actions={
          <Link href={`/campaigns/${c.id}/certificate`} className={btnQuiet}>Certificate of Broadcast</Link>
        }
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
            {isDraft && (
              <EditCampaignButton
                campaign={c as never}
                customers={customerOpts as never}
                stations={(allStations ?? []) as never}
                action={updateCampaign} />
            )}
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

      {/* Materials on this campaign */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">
            Materials <span className="text-neutral-400 font-normal">({materials.length})</span>
          </h2>
          {isDraft && (
            <AddMaterialButton campaignId={c.id} available={availableMaterials as never} action={addCampaignMaterial} />
          )}
        </div>
        <div className="mt-4">
          {materials.length === 0 ? (
            <EmptyState title="No materials on this campaign"
              hint={isDraft ? "Add the audio spot(s) this campaign airs — then you can build segments." : "This campaign has no materials."} />
          ) : (
            <Card className="divide-y divide-neutral-100">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-brand w-12">{Math.floor(m.duration_secs/60)}:{String(Math.round(m.duration_secs%60)).padStart(2,"0")}</span>
                  <span className="text-ink">{m.name}</span>
                  {isDraft && (
                    <ActionForm action={removeCampaignMaterial} className="inline ml-auto">
                      <input type="hidden" name="campaign_id" value={c.id} />
                      <input type="hidden" name="material_id" value={m.id} />
                      <button className="text-xs text-red-700 hover:underline">Remove</button>
                    </ActionForm>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

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
                      <div className="flex items-center gap-3">
                        <EditSegmentButton
                          seg={{ ...s, material_ids: segMaterialIds.get(s.id) ?? [] } as never}
                          campaignId={c.id} campaignStart={c.start_date} campaignEnd={c.end_date}
                          materials={materials as never} action={updateSegment} />
                        <ActionForm action={deleteSegment} className="inline">
                          <input type="hidden" name="segment_id" value={s.id} />
                          <input type="hidden" name="campaign_id" value={c.id} />
                          <button className="text-xs text-red-700 hover:underline">Remove</button>
                        </ActionForm>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">
            Schedule <span className="text-neutral-400 font-normal">({(plays ?? []).length} play{(plays ?? []).length === 1 ? "" : "s"})</span>
          </h2>
          <div className="flex items-center gap-3">
            {(c as never as { ecirs_contract_id: string | null }).ecirs_contract_id && (plays ?? []).length > 0 && (
              <ActionForm action={sendAiringProof} className="inline">
                <input type="hidden" name="campaign_id" value={c.id} />
                <button className={btnQuiet}>Send airing proof to ECIRS</button>
              </ActionForm>
            )}
            {(segments ?? []).length > 0 && (
              <ActionForm action={generateSchedule} className="inline">
                <input type="hidden" name="campaign_id" value={c.id} />
                <button className={btnQuiet}>{(plays ?? []).length ? "Regenerate schedule" : "Generate schedule"}</button>
              </ActionForm>
            )}
          </div>
        </div>

        {(plays ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-1">{airedCount} aired</span>
            <span className="rounded-md bg-neutral-100 text-neutral-600 px-2 py-1">{upcomingCount} upcoming</span>
            {missedCount > 0 && <span className="rounded-md bg-red-50 text-red-700 px-2 py-1">{missedCount} missed</span>}
            {shiftedCount > 0 && <span className="rounded-md bg-amber-50 text-amber-700 px-2 py-1">{shiftedCount} shifted</span>}
          </div>
        )}
        {shiftedCount > 0 && (
          <p className="mt-2 text-xs text-neutral-500">
            Shifted plays aired outside the requested hours (actual time shown in brackets) — still counted as played.
          </p>
        )}

        <div className="mt-4">
          {(plays ?? []).length === 0 ? (
            <EmptyState title="No schedule yet"
              hint={(segments ?? []).length ? "Generate the schedule to place plays into breaks." : "Add a segment first."} />
          ) : (
            <div className="space-y-4">
              {Array.from(byDate.entries()).map(([date, dayPlays]) => (
                <Card key={date} className="overflow-hidden">
                  <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-50 text-sm font-medium text-ink">{date}</div>
                  <div className="divide-y divide-neutral-100">
                    {(dayPlays ?? []).map((p) => {
                      const missed = p.air_state === "missed";
                      const aired = p.air_state === "aired";
                      return (
                        <div key={p.id}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm flex-wrap ${
                            missed ? "bg-red-50" : p.shifted ? "bg-amber-50/60" : ""}`}>
                          <span className={`font-mono w-20 ${missed ? "text-red-700 line-through" : p.shifted ? "text-amber-700" : "text-brand"}`}>
                            {p.actual_time ? String(p.actual_time).slice(0,5) : "—"}
                            {p.shifted && p.actual_time && (
                              <span className="text-neutral-400 ml-1">({String(p.actual_time).slice(0,5)})</span>
                            )}
                          </span>
                          <span className={missed ? "text-red-700 line-through" : "text-ink"}>{matName.get(p.material_id) ?? "—"}</span>
                          <span className="text-neutral-400 text-xs">{p.break_id ? brkName.get(p.break_id) ?? "" : "unplaced"}</span>
                          {p.shifted && <Badge tone="warning">shifted</Badge>}
                          {missed && <Badge tone="danger">missed</Badge>}
                          {aired && <Badge tone="success">aired</Badge>}
                          {p.shifted && p.shift_reason && (
                            <span className="text-xs text-neutral-400 hidden sm:inline">{p.shift_reason}</span>
                          )}
                          <div className="ml-auto flex items-center gap-2">
                            {p.air_state !== "missed" ? (
                              <ActionForm action={setPlayAirState} className="inline">
                                <input type="hidden" name="play_id" value={p.id} />
                                <input type="hidden" name="campaign_id" value={c.id} />
                                <input type="hidden" name="air_state" value="missed" />
                                <button className="text-xs text-red-700 hover:underline">Mark missed</button>
                              </ActionForm>
                            ) : (
                              <ActionForm action={setPlayAirState} className="inline">
                                <input type="hidden" name="play_id" value={p.id} />
                                <input type="hidden" name="campaign_id" value={c.id} />
                                <input type="hidden" name="air_state" value="scheduled" />
                                <button className="text-xs text-brand hover:underline">Restore</button>
                              </ActionForm>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
