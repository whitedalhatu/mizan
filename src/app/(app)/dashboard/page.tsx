import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "../ui";

export default async function DashboardPage() {
  const supabase = createClient();
  const [{ count: stations }, { count: breaks }, { count: categories }] = await Promise.all([
    supabase.from("stations").select("id", { count: "exact", head: true }),
    supabase.from("commercial_breaks").select("id", { count: "exact", head: true }),
    supabase.from("customer_categories").select("id", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "Stations", value: stations ?? 0, href: "/stations" },
    { label: "Commercial breaks", value: breaks ?? 0, href: "/breaks" },
    { label: "Customer categories", value: categories ?? 0, href: "/categories" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="MIZAN is set up in stages. This is Stage 0 — the foundation: stations and their playout connections, the day's commercial breaks, and customer categories. Campaign creation and scheduling come next."
      />
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}
            className="rounded-xl border border-neutral-200 bg-white p-5 hover:shadow-sm transition-shadow">
            <p className="text-3xl font-semibold text-ink tabular-nums">{c.value}</p>
            <p className="text-sm text-neutral-500 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
