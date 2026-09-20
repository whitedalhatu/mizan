"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, btn } from "../../ui";

type Result = { ok: boolean; message: string };
type Material = { id: string; name: string; duration_secs: number };

const DAYS: [string, string][] = [
  ["runs_mon", "Mon"], ["runs_tue", "Tue"], ["runs_wed", "Wed"], ["runs_thu", "Thu"],
  ["runs_fri", "Fri"], ["runs_sat", "Sat"], ["runs_sun", "Sun"],
];
function fmt(s: number) { const m = Math.floor(s / 60), sec = Math.round(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; }

// Build a segment: its date sub-range, weekdays, hour window, material rotation,
// and how many plays (per day or across the whole segment).
export function SegmentForm({
  campaignId, campaignStart, campaignEnd, materials, action, onDone,
}: {
  campaignId: string; campaignStart: string; campaignEnd: string;
  materials: Material[]; action: (fd: FormData) => Promise<Result>; onDone?: () => void;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
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
      <Field label="Segment name" optional><Input name="name" placeholder="e.g. Morning drive" /></Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Starts on" hint={`Within ${campaignStart} to ${campaignEnd}`}>
          <Input name="start_date" type="date" min={campaignStart} max={campaignEnd} defaultValue={campaignStart} required />
        </Field>
        <Field label="Ends on">
          <Input name="end_date" type="date" min={campaignStart} max={campaignEnd} defaultValue={campaignEnd} required />
        </Field>
      </div>

      <div>
        <span className="text-sm font-medium text-ink">Runs on</span>
        <div className="mt-1 flex flex-wrap gap-3">
          {DAYS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name={k} defaultChecked={k !== "runs_sat" && k !== "runs_sun"} /> {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Hour from"><Input name="hour_from" type="time" defaultValue="05:00" required /></Field>
        <Field label="Hour to"><Input name="hour_to" type="time" defaultValue="11:59" required /></Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Number of plays"><Input name="plays_count" type="number" min={1} defaultValue={2} required /></Field>
        <Field label="Counted">
          <Select name="plays_basis" defaultValue="per_day">
            <option value="per_day">Per day</option>
            <option value="per_segment">Across the whole segment</option>
          </Select>
        </Field>
      </div>

      <div>
        <span className="text-sm font-medium text-ink">Materials that rotate</span>
        <p className="text-xs text-neutral-500 mt-0.5">If you pick several, MIZAN rotates through them across the plays.</p>
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

      <button className={btn} disabled={pending}>{pending ? "Adding…" : "Add segment"}</button>
      {result && <p className={`text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
    </form>
  );
}
