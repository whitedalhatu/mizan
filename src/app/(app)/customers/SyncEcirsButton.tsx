"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { btnQuiet } from "../ui";

type Result = { ok: boolean; message: string };

export function SyncEcirsButton({ action }: { action: () => Promise<Result> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Result | null>(null);
  return (
    <div className="flex items-center gap-2">
      {msg && <span className={`text-xs ${msg.ok ? "text-brand" : "text-red-700"}`}>{msg.message}</span>}
      <button
        className={btnQuiet}
        disabled={pending}
        onClick={() => startTransition(async () => { const r = await action(); setMsg(r); if (r.ok) router.refresh(); })}>
        {pending ? "Syncing…" : "Sync from ECIRS"}
      </button>
    </div>
  );
}
