"use client";

import { useState, useTransition, useRef } from "react";
import { input } from "./tokens";

type Result = { ok: boolean; message: string };
type ServerAction = (fd: FormData) => Promise<Result>;

export function ActionForm({
  action, children, className, resetOnSuccess, onSuccess,
}: { action: ServerAction; children: React.ReactNode; className?: string; resetOnSuccess?: boolean; onSuccess?: () => void }) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const formEl = e.currentTarget;
        const fd = new FormData(formEl);
        startTransition(async () => {
          const r = await action(fd);
          setResult(r);
          if (r.ok) { if (resetOnSuccess) formEl.reset(); onSuccess?.(); }
        });
      }}>
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      {result && <p className={`mt-2 text-sm ${result.ok ? "text-brand" : "text-red-700"} break-all`}>{result.message}</p>}
    </form>
  );
}

export function Field({
  label, hint, optional, children, className = "",
}: { label: string; hint?: string; optional?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block " + className}>
      <span className="text-sm font-medium text-ink">
        {label}{optional && <span className="text-neutral-400 font-normal"> (optional)</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-xs text-neutral-500 mt-1 block">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={input + " " + (props.className ?? "")} />;
}

export function Select({
  className = "", children, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <span className="relative block">
      <select {...props} className={input + " appearance-none pr-9 " + className}>{children}</select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
        viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function FileInput({ name, accept }: { name: string; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current?.click()}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Choose image</button>
      <span className="text-sm text-neutral-500 truncate max-w-[16rem]">{fileName || "No file chosen"}</span>
      <input ref={ref} type="file" name={name} accept={accept}
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} className="hidden" />
    </div>
  );
}
