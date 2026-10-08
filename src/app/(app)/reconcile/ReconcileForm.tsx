"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Select, btn } from "../ui";

type Result = { ok: boolean; message: string };
type Station = { id: string; code: string; name: string };

export function ReconcileForm({ stations, action }: { stations: Station[]; action: (fd: FormData) => Promise<Result> }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(f: File | null) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("csv", csv);
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Station">
            <Select name="station_id" required defaultValue="">
              <option value="" disabled>Choose a station…</option>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50">Load a .csv file</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-ink">RadioBOSS broadcast log</span>
          <p className="text-xs text-neutral-500 mt-0.5 mb-1">Paste the log contents, or load a .csv above. Columns: Artist (filename), Length, Start Date, Start Time.</p>
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8}
            placeholder="Artist,Length,Start Date,Start Time&#10;DODAN FOODS HAUSA.mp3,01:01,9/16/2026,12:52:54 PM"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="mark_misses" />
          Mark scheduled spots not found in this log as <span className="text-red-700">missed</span> (only tick if the log covers the whole period)
        </label>

        <button className={btn} disabled={pending}>{pending ? "Reconciling…" : "Reconcile"}</button>
        {result && <p className={`text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
      </div>
    </form>
  );
}
