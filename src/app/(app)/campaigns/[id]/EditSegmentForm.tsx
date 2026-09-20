"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, btn } from "../../ui";

type Result = { ok: boolean; message: string };
type Material = { id: string; name: string; duration_secs: number };
type Seg = {
  id: string; name: string; start_date: string; end_date: string;
  hour_from: string; hour_to: string; plays_count: number; plays_basis: string;
  runs_mon: boolean; runs_tue: boolean; runs_wed: boolean; runs_thu: boolean;
  runs_fri: boolean; runs_sat: boolean; runs_sun: boolean;
  material_ids: string[];
};

const DAYS: [string, string, string][] = [
  ["runs_mon", "Mon", "runs_mon"], ["runs_tue", "Tue", "runs_tue"], ["runs_wed", "Wed", "runs_wed"],
  ["runs_thu", "Thu", "runs_thu"], ["runs_fri", "Fri", "runs_fri"], ["runs_sat", "Sat", "runs_sat"], ["runs_sun", "Sun", "runs_sun"],
];
function fmt(s: number) { const m = Math.floor(s / 60), sec = Math.round(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; }

export function EditSegmentForm({
  seg, campaignId, campaignStart, campaignEnd, materials, action, onDone,
}: {
  seg: Seg; campaignId: string; campaignStart: string; campaignEnd: string;
  materials: Material[]; action: (fd: FormData) => Promise<Result>; onDone?: () => void;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(seg.material_ids);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("segment_id", seg.id);
    fd.set("campaign_id", campaignId);
    picked.forEach((m) => fd.append("material_ids", m));
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) { router.refresh(); onDone?.(); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Segment name" optional><Input name="name" defaultValue={seg.name} /></Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Starts on" hint={`Within ${campaignStart} to ${campaignEnd}`}>
          <Input name="start_date" type="date" min={campaignStart} max={campaignEnd} defaultValue={seg.start_date} required />
        </Field>
        <Field label="Ends on">
          <Input name="end_date" type="date" min={campaignStart} max={campaignEnd} defaultValue={seg.end_date} required />
        </Field>
      </div>

      <div>
        <span className="text-sm font-medium text-ink">Runs on</span>
        <div className="mt-1 flex flex-wrap gap-3">
          {DAYS.map(([k, label, field]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name={k} defaultChecked={seg[field as keyof Seg] as boolean} /> {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Hour from"><Input name="hour_from" type="time" defaultValue={String(seg.hour_from).slice(0,5)} required /></Field>
        <Field label="Hour to"><Input name="hour_to" type="time" defaultValue={String(seg.hour_to).slice(0,5)} required /></Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Number of plays"><Input name="plays_count" type="number" min={1} defaultValue={seg.plays_count} required /></Field>
        <Field label="Counted">
          <Select name="plays_basis" defaultValue={seg.plays_basis}>
            <option value="per_day">Per day</option>
            <option value="per_segment">Across the whole segment</option>
          </Select>
        </Field>
      </div>

      <div>
        <span className="text-sm font-medium text-ink">Materials that rotate</span>
        <div className="mt-2 rounded-lg border border-neutral-200 divide-y divide-neutral-100 max-h-44 overflow-y-auto">
          {materials.length === 0 && <p className="px-3 py-3 text-sm text-neutral-400">This campaign has no materials.</p>}
          {materials.map((m) => (
            <label key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer">
              <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
              <span className="font-mono text-xs text-brand">{fmt(m.duration_secs)}</span>
              <span className="text-ink">{m.name}</span>
            </label>
          ))}
        </div>
      </div>

      <button className={btn} disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      {result && <p className={`text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
    </form>
  );
}
