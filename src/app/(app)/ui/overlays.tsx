"use client";

import { useEffect } from "react";

export function Modal({
  open, onClose, title, description, children, maxW = "max-w-2xl",
}: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; maxW?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`relative ${maxW} w-full rounded-2xl bg-white shadow-xl border border-neutral-200 mt-8 sm:mt-16`}>
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="text-sm text-neutral-500 mt-1 leading-relaxed max-w-xl">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"
            className="rounded-md w-8 h-8 grid place-items-center text-neutral-400 hover:bg-neutral-100 hover:text-ink shrink-0 -mr-1 -mt-1">
            <span className="text-lg leading-none">✕</span>
          </button>
        </div>
        <div className="px-6 pb-6 pt-5">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({
  open, onClose, title, subtitle, children, footer,
}: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  return (
    <>
      <div aria-hidden onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} />
      <aside role="dialog" aria-modal="true" aria-label={title}
        className={`fixed right-0 top-0 z-50 h-full w-[520px] max-w-[90vw] bg-white shadow-2xl border-l border-neutral-200 flex flex-col transition-transform duration-200 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-neutral-200">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink truncate">{title}</h2>
            {subtitle && <p className="text-sm text-neutral-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"
            className="rounded-md w-8 h-8 grid place-items-center text-neutral-400 hover:bg-neutral-100 hover:text-ink shrink-0 -mr-1">
            <span className="text-lg leading-none">✕</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-neutral-200 px-6 py-4">{footer}</footer>}
      </aside>
    </>
  );
}
