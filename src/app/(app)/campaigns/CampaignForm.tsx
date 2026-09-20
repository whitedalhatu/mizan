"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, btn } from "../ui";

type Result = { ok: boolean; message: string; id?: string };
type Customer = { id: string; name: string; category: string | null };
type Station = { id: string; code: string; name: string };
type Material = { id: string; name: string; duration_secs: number };

function fmt(s: number) { const m = Math.floor(s / 60), sec = Math.round(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; }

// Create a campaign (Stage 1 — recording only, no scheduling yet).
export function CampaignForm({
  customers, stations, materials, action, onDone,
}: {
  customers: Customer[]; stations: Station[]; materials: Material[];
  action: (fd: FormData) => Promise<Result>; onDone?: () => void;
}) {
  const router = useRouter();
  const [pickedMaterials, setPickedMaterials] = useState<string[]>([]);
  const [competition, setCompetition] = useState("auto");
  const [pickedCompetitors, setPickedCompetitors] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    pickedMaterials.forEach((m) => fd.append("material_ids", m));
    if (competition === "manual") pickedCompetitors.forEach((c) => fd.append("competitor_ids", c));
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) { router.refresh(); onDone?.(); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Campaign name"><Input name="name" placeholder="e.g. Dangote Free Fuel" required /></Field>
        <Field label="Customer">
          <Select name="customer_id" required defaultValue="">
            <option value="" disabled>Choose a customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.category ? ` · ${c.category}` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Station">
          <Select name="station_id" required defaultValue="">
            <option value="" disabled>Choose a station…</option>
            {stations.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </Select>
        </Field>
        <div />
        <Field label="Starts on"><Input name="start_date" type="date" required /></Field>
        <Field label="Ends on"><Input name="end_date" type="date" required /></Field>
      </div>

      <div>
        <span className="text-sm font-medium text-ink">Materials</span>
        <p className="text-xs text-neutral-500 mt-0.5">Pick the audio spot(s) this campaign airs. A campaign can have several.</p>
        <div className="mt-2 rounded-lg border border-neutral-200 divide-y divide-neutral-100 max-h-52 overflow-y-auto">
          {materials.length === 0 && <p className="px-3 py-3 text-sm text-neutral-400">No materials yet — add some under Materials first.</p>}
          {materials.map((m) => (
            <label key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer">
              <input type="checkbox" checked={pickedMaterials.includes(m.id)} onChange={() => toggle(pickedMaterials, setPickedMaterials, m.id)} />
              <span className="font-mono text-xs text-brand">{fmt(m.duration_secs)}</span>
              <span className="text-ink">{m.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-ink">Competing customers</span>
        <p className="text-xs text-neutral-500 mt-0.5">How MIZAN keeps rivals out of the same break (used when scheduling, from Stage 2).</p>
        <div className="mt-2">
          <Select value={competition} onChange={(e) => setCompetition(e.target.value)} name="competition_mode">
            <option value="auto">Separate from all campaigns in the same category</option>
            <option value="manual">Manually choose competing customers</option>
            <option value="none">No separation</option>
          </Select>
        </div>
        {competition === "manual" && (
          <div className="mt-2 rounded-lg border border-neutral-200 divide-y divide-neutral-100 max-h-40 overflow-y-auto">
            {customers.map((c) => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer">
                <input type="checkbox" checked={pickedCompetitors.includes(c.id)} onChange={() => toggle(pickedCompetitors, setPickedCompetitors, c.id)} />
                <span className="text-ink">{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button className={btn} disabled={pending}>{pending ? "Creating…" : "Create campaign"}</button>
      {result && <p className={`text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
    </form>
  );
}
