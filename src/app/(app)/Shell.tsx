"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string };

const ICONS: Record<string, string> = {
  dashboard: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z",
  stations: "M12 2a5 5 0 015 5c0 2-1 3-2 4m-6 0C8 10 7 9 7 7a5 5 0 015-5m0 8v12M8 22h8",
  breaks: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  categories: "M4 6h16M4 12h16M4 18h10",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

function Icon({ name }: { name: string }) {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[name] ?? ICONS.dashboard} /></svg>
  );
}

export function Shell({
  orgName, email, ecirsConnected, nav, children,
}: {
  orgName: string; email: string; ecirsConnected: boolean;
  nav: NavItem[]; children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try { if (localStorage.getItem("mizan.sidebar.collapsed") === "1") setCollapsed(true); } catch { /* ignore */ }
  }, []);
  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("mizan.sidebar.collapsed", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  const card = (expanded: boolean, showToggle: boolean) => (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {expanded ? (
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <p className="text-[0.6rem] tracking-[0.22em] text-brand font-semibold truncate">{orgName.toUpperCase()}</p>
            <p className="font-display text-xl text-ink leading-none mt-0.5">MIZAN</p>
          </div>
          {showToggle && (
            <button onClick={toggleCollapsed} aria-label="Collapse sidebar"
              className="hidden lg:grid place-items-center w-8 h-8 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-ink shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M9 12h7m-3-3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4 border-b border-neutral-100">
          <p className="font-display text-lg text-ink">M</p>
          {showToggle && (
            <button onClick={toggleCollapsed} aria-label="Expand sidebar"
              className="hidden lg:grid place-items-center w-8 h-8 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-ink">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      )}

      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="px-2 space-y-0.5">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                title={!expanded ? item.label : undefined}
                className={`group relative flex items-center rounded-xl text-sm font-medium transition-colors ${
                  expanded ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"} ${
                  active ? "bg-accent-soft text-brand ring-1 ring-brand/15" : "text-neutral-600 hover:bg-neutral-100 hover:text-ink"}`}>
                {active && expanded && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-brand" />}
                <Icon name={item.icon} />
                {expanded && <span className="truncate">{item.label}</span>}
                {!expanded && (
                  <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-neutral-100">
        {expanded ? (
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-ink truncate">{email}</p>
            <p className="text-xs mt-1">
              <span className={ecirsConnected ? "text-brand" : "text-neutral-400"}>
                {ecirsConnected ? "● ECIRS connected" : "○ ECIRS not connected"}
              </span>
            </p>
            <form action="/auth/signout" method="post" className="mt-2">
              <button className="flex items-center gap-2 text-sm text-neutral-500 hover:text-ink">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 16l4-4-4-4M7 12h14M13 4H5a2 2 0 00-2 2v12a2 2 0 002 2h8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="px-2 py-3 flex justify-center">
            <form action="/auth/signout" method="post">
              <button title="Sign out" className="text-neutral-400 hover:text-ink">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 16l4-4-4-4M7 12h14M13 4H5a2 2 0 00-2 2v12a2 2 0 002 2h8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-neutral-200 px-4 py-3">
        <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="rounded p-1.5 hover:bg-neutral-100 text-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" /></svg>
        </button>
        <span className="font-display text-lg text-ink">MIZAN</span>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[85vw] p-3">{card(true, false)}</div>
        </div>
      )}

      <div className={`hidden lg:block shrink-0 transition-[width] duration-200 ${collapsed ? "w-[84px]" : "w-64"}`}>
        <div className="sticky top-0 h-screen p-3">{card(!collapsed, true)}</div>
      </div>

      <div className="flex-1 min-w-0">
        <main className="px-4 py-6 sm:px-6 lg:pl-2 lg:pr-8 max-w-5xl">{children}</main>
      </div>
    </div>
  );
}
