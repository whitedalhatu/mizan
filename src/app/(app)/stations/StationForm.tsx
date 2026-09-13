"use client";

import { useState, useTransition } from "react";
import { inputCls, btnCls } from "../Forms";

type Result = { ok: boolean; message: string };

// Create-station form. The playout-connection fields shown depend on the chosen
// playout type — RadioBOSS asks for its API details; "other" takes a note; "none"
// asks nothing (connect later). This is the one job MIZAN always owns, whether
// the station is typed here or imported from ECIRS.
export function StationForm({ action, onDone }: { action: (fd: FormData) => Promise<Result>; onDone?: () => void }) {
  const [playoutType, setPlayoutType] = useState("none");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

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
          if (r.ok) { formEl.reset(); setPlayoutType("none"); onDone?.(); }
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">Code</span>
        <input name="code" placeholder="FRQ" maxLength={4} required className={inputCls} disabled={pending} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Name</span>
        <input name="name" placeholder="Freedom Radio 99.5 FM" required className={inputCls} disabled={pending} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Frequency <span className="text-neutral-400">(optional)</span></span>
        <input name="frequency" placeholder="99.5 FM" className={inputCls} disabled={pending} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Playout system</span>
        <select name="playout_type" value={playoutType}
          onChange={(e) => setPlayoutType(e.target.value)} className={inputCls} disabled={pending}>
          <option value="none">None yet \u2014 connect later</option>
          <option value="radioboss">RadioBOSS</option>
          <option value="other">Other</option>
        </select>
      </label>

      {playoutType === "radioboss" && (
        <div className="sm:col-span-2 rounded border border-brand-mist bg-brand-mist/40 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-xs text-neutral-600">
            RadioBOSS connection. Stored now; the live reading of what aired is
            switched on at the playout stage.
          </p>
          <label className="block">
            <span className="text-xs text-neutral-500">RadioBOSS API URL</span>
            <input name="rb_api_url" placeholder="http://studio-pc:9000" className={inputCls} disabled={pending} />
          </label>
          <label className="block">
            <span className="text-xs text-neutral-500">API password</span>
            <input name="rb_api_password" type="password" className={inputCls} disabled={pending} />
          </label>
        </div>
      )}

      {playoutType === "other" && (
        <label className="sm:col-span-2 block">
          <span className="text-xs text-neutral-500">Which playout system? (we&apos;ll add an adapter for it)</span>
          <input name="other_note" placeholder="e.g. Myriad, Zetta, WideOrbit\u2026" className={inputCls} disabled={pending} />
        </label>
      )}

      <div className="sm:col-span-2">
        <button className={btnCls} disabled={pending}>{pending ? "Creating\u2026" : "Create station"}</button>
      </div>

      {result && (
        <p className={`sm:col-span-2 text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>
      )}
    </form>
  );
}
