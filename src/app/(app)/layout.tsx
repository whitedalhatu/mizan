import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/identity";
import { getSettings } from "@/lib/settings";

// The signed-in shell: a sidebar of the Stage 0 areas plus the main pane.
// Kept deliberately small — more nav appears as later stages add features.
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stations", label: "Stations" },
  { href: "/breaks", label: "Breaks" },
  { href: "/categories", label: "Categories" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const { orgName, ecirsConnected } = await getSettings();

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-paper">
      <aside className="bg-brand-deep text-white flex flex-col">
        <div className="px-6 py-5">
          <p className="text-[0.6rem] tracking-[0.25em] text-accent font-semibold uppercase">
            {orgName}
          </p>
          <p className="font-display text-2xl leading-none mt-0.5">MIZAN</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="block rounded px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-white/60">{identity.email}</p>
          <p className="text-[0.7rem] mt-1">
            <span className={ecirsConnected ? "text-accent" : "text-white/40"}>
              {ecirsConnected ? "\u25CF ECIRS connected" : "\u25CB ECIRS not connected"}
            </span>
          </p>
          <form action="/auth/signout" method="post" className="mt-2">
            <button type="submit" className="text-xs text-white/70 hover:text-white">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
