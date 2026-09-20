"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, btn } from "../../ui";

type Result = { ok: boolean; message: string };
type Customer = { id: string; name: string; category: string | null };
type Station = { id: string; code: string; name: string };
type Campaign = {
  id: string; name: string; customer_id: string; station_id: string;
  start_date: string; end_date: string; competition_mode: string;
};

// Edit a draft campaign's core details, pre-filled.
export function EditCampaignForm({
  campaign, customers, stations, action, onDone,
}: {
  campaign: Campaign; customers: Customer[]; stations: Station[];
  action: (fd: FormData) => Promise<Result>; onDone?: () => void;
}) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("id", campaign.id);
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) { router.refresh(); onDone?.(); }
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Campaign name" className="sm:col-span-2">
        <Input name="name" defaultValue={campaign.name} required />
      </Field>
      <Field label="Customer">
        <Select name="customer_id" defaultValue={campaign.customer_id} required>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.category ? ` · ${c.category}` : ""}</option>)}
        </Select>
      </Field>
      <Field label="Station" hint="Changing the station clears the schedule (breaks belong to a station).">
        <Select name="station_id" defaultValue={campaign.station_id} required>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
        </Select>
      </Field>
      <Field label="Starts on"><Input name="start_date" type="date" defaultValue={campaign.start_date} required /></Field>
      <Field label="Ends on"><Input name="end_date" type="date" defaultValue={campaign.end_date} required /></Field>
      <Field label="Competing customers" className="sm:col-span-2">
        <Select name="competition_mode" defaultValue={campaign.competition_mode}>
          <option value="auto">Separate from all campaigns in the same category</option>
          <option value="manual">Manually chosen competitors</option>
          <option value="none">No separation</option>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <button className={btn} disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </div>
      {result && <p className={`sm:col-span-2 text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
    </form>
  );
}
