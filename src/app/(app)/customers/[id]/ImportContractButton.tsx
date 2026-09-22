"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, Field, Select, btn } from "../../ui";

type Result = { ok: boolean; message: string; id?: string };
type Station = { id: string; code: string; name: string };

export function ImportContractButton({
  customerId, ecirsClientId, contract, stations, action,
}: {
  customerId: string; ecirsClientId: string;
  contract: { id: string; campaign_name: string; station_code: string | null };
  stations: Station[];
  action: (fd: FormData) => Promise<Result>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  // Pre-select the MIZAN station matching the ECIRS station code, if any.
  const match = stations.find((s) => s.code === contract.station_code);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("customer_id", customerId);
    fd.set("ecirs_client_id", ecirsClientId);
    fd.set("ecirs_contract_id", contract.id);
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) { router.refresh(); if (r.id) router.push(`/campaigns/${r.id}`); }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-brand font-medium hover:underline">Bring in as campaign</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Bring in as campaign"
        description={`"${contract.campaign_name}" — confirm which MIZAN station it runs on.`}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="MIZAN station" hint={contract.station_code ? `ECIRS station: ${contract.station_code}` : undefined}>
            <Select name="station_id" defaultValue={match?.id ?? ""} required>
              <option value="" disabled>Choose a station…</option>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </Select>
          </Field>
          <button className={btn} disabled={pending}>{pending ? "Bringing in…" : "Bring in"}</button>
          {result && <p className={`text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
        </form>
      </Modal>
    </>
  );
}
