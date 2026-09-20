"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, btn } from "../ui";

type Result = { ok: boolean; message: string };
type BreakData = {
  id: string; name: string; start_time: string; duration_secs: number;
  runs_mon: boolean; runs_tue: boolean; runs_wed: boolean; runs_thu: boolean;
  runs_fri: boolean; runs_sat: boolean; runs_sun: boolean;
};

const DAYS: [string, string, string][] = [
  ["mon", "Mon", "runs_mon"], ["tue", "Tue", "runs_tue"], ["wed", "Wed", "runs_wed"],
  ["thu", "Thu", "runs_thu"], ["fri", "Fri", "runs_fri"], ["sat", "Sat", "runs_sat"], ["sun", "Sun", "runs_sun"],
];

// Edit an existing break — pre-filled with its current values.
export function EditBreakForm({
  brk, action, onDone,
}: { brk: BreakData; action: (fd: FormData) => Promise<Result>; onDone?: () => void }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("id", brk.id);
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) { router.refresh(); onDone?.(); }
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Break name" className="sm:col-span-2">
        <Input name="name" defaultValue={brk.name} required />
      </Field>
      <Field label="Start time">
        <Input name="start_time" type="time" defaultValue={String(brk.start_time).slice(0, 5)} required />
      </Field>
      <Field label="Duration (minutes)">
        <Input name="duration_mins" type="number" min={1} step={1} defaultValue={Math.round(brk.duration_secs / 60)} required />
      </Field>
      <div className="sm:col-span-2">
        <span className="text-sm font-medium text-ink">Runs on</span>
        <div className="mt-1 flex flex-wrap gap-3">
          {DAYS.map(([k, label, field]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name={k} defaultChecked={brk[field as keyof BreakData] as boolean} /> {label}
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <button className={btn} disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </div>
      {result && <p className={`sm:col-span-2 text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
    </form>
  );
}
