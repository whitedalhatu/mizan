import { createClient } from "@/lib/supabase/server";

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
      <h1 className="font-display text-3xl text-brand rule-accent inline-block">Dashboard</h1>
      <p className="text-sm text-neutral-600 mt-4 max-w-2xl">
        MIZAN is set up in stages. This is Stage 0 &mdash; the foundation: stations
        and their playout connections, the day&apos;s commercial breaks, and customer
        categories. Campaign creation and scheduling come next.
      </p>
      <div className="grid grid-cols-3 gap-4 mt-6">
        {cards.map((c) => (
          <a key={c.label} href={c.href}
            className="rounded-lg border border-brand-mist bg-white p-5 hover:shadow-sm transition">
            <p className="text-3xl font-display text-brand">{c.value}</p>
            <p className="text-sm text-neutral-600 mt-1">{c.label}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
