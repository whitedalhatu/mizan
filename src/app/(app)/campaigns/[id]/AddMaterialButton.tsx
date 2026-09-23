"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, Select, btn } from "../../ui";

type Result = { ok: boolean; message: string };
type Material = { id: string; name: string; duration_secs: number };

function fmt(s: number) { const m = Math.floor(s / 60), sec = Math.round(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; }

// Attach a material from the library to this campaign. `available` excludes ones
// already attached.
export function AddMaterialButton({
  campaignId, available, action,
}: { campaignId: string; available: Material[]; action: (fd: FormData) => Promise<Result> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("campaign_id", campaignId);
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) { router.refresh(); setOpen(false); }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={btn}>+ Add material</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a material to this campaign"
        description="Pick an audio spot from your library. Upload new ones under Materials first.">
        {available.length === 0 ? (
          <p className="text-sm text-neutral-500">All your materials are already on this campaign, or none are uploaded yet. Add audio under <span className="font-medium">Materials</span>.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink">Material</span>
              <div className="mt-1">
                <Select name="material_id" required defaultValue="">
                  <option value="" disabled>Choose a material…</option>
                  {available.map((m) => <option key={m.id} value={m.id}>{fmt(m.duration_secs)} · {m.name}</option>)}
                </Select>
              </div>
            </label>
            <button className={btn} disabled={pending}>{pending ? "Adding…" : "Add material"}</button>
            {result && <p className={`text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
          </form>
        )}
      </Modal>
    </>
  );
}
