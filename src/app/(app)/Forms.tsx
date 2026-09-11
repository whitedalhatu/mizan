"use client";

import { useState, useTransition } from "react";

type Result = { ok: boolean; message: string };
type ServerAction = (fd: FormData) => Promise<Result>;

export function ActionForm({
  action, children, className, resetOnSuccess,
}: { action: ServerAction; children: React.ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const formEl = e.currentTarget;
        const fd = new FormData(formEl);
        startTransition(async () => {
          const r = await action(fd);
          setResult(r);
          if (r.ok && resetOnSuccess) formEl.reset();
        });
      }}
    >
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      {result && (
        <p className={`mt-2 text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>
      )}
    </form>
  );
}

export const inputCls = "mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm bg-white";
export const btnCls = "rounded bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-deep disabled:opacity-50";
export const btnQuietCls = "rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50";
