"use client";

import { useState, useTransition } from "react";
import { inputCls, btnCls } from "../Forms";

type Result = { ok: boolean; message: string };
type Station = { id: string; code: string; name: string };
const DAYS: [string, string][] = [
  ["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"],
  ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"],
];

// Build a commercial break by hand: which station, when in the day, how long,
// and which weekdays it runs. Campaign spots are placed into these later.
export function BreakForm({ stations, action }: {
  stations: Station[];
  action: (fd: FormData) => Promise<Result>;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  if (stations.length === 0) {
    return <p className="text-sm text-neutral-500">Create a station first \u2014 breaks belong to a station.</p>;
  }

  return (
    <form
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formEl = e.currentTarget;
        const fd = new FormData(formEl);
        startTransition(async () => {
          const r = await action(fd);
          setResult(r);
          if (r.ok) formEl.reset();
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">Station</span>
        <select name="station_id" required className={inputCls} disabled={pending}>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.code} \u2014 {s.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium">Break name</span>
        <input name="name" placeholder="Morning drive break" required className={inputCls} disabled={pending} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Start time</span>
        <input name="start_time" type="time" required className={inputCls} disabled={pending} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Duration (minutes)</span>
        <input name="duration_mins" type="number" min={1} step={1} placeholder="3" required className={inputCls} disabled={pending} />
      </label>
      <div className="sm:col-span-2">
        <span className="text-sm font-medium">Runs on</span>
        <div className="mt-1 flex flex-wrap gap-3">
          {DAYS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name={k} defaultChecked={k !== "sat" && k !== "sun"} disabled={pending} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <button className={btnCls} disabled={pending}>{pending ? "Adding\u2026" : "Add break"}</button>
      </div>
      {result && <p className={`sm:col-span-2 text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
    </form>
  );
}
