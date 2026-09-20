import { createClient } from "@/lib/supabase/server";
import { ActionForm, PageHeader, Card, Badge, EmptyState } from "../ui";
import { NewCampaignButton } from "./NewCampaignButton";
import { createCampaign, deleteCampaign } from "./actions";

const STATUS: Record<string, "neutral" | "brand" | "success" | "danger"> = {
  draft: "neutral", active: "brand", completed: "success", cancelled: "danger",
};

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const supabase = createClient();

  // Fetch campaigns plainly (no embedded joins — an unresolved join can return
  // nothing silently). Then attach customer/station names with lookup maps.
  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id, number, name, status, start_date, end_date, customer_id, station_id")
    .order("created_at", { ascending: false });

  const [{ data: customers }, { data: stations }, { data: materials }] = await Promise.all([
    supabase.from("customers").select("id, name, customer_categories ( name )").eq("active", true).order("name"),
    supabase.from("stations").select("id, code, name").eq("active", true).order("code"),
    supabase.from("materials").select("id, name, duration_secs").order("created_at", { ascending: false }),
  ]);

  // Name lookups (include inactive too, so a campaign for a since-deactivated
  // customer/station still shows its name).
  const { data: allCustomers } = await supabase.from("customers").select("id, name");
  const { data: allStations } = await supabase.from("stations").select("id, code");
  const custName = new Map((allCustomers ?? []).map((c) => [c.id, c.name]));
  const stnCode = new Map((allStations ?? []).map((s) => [s.id, s.code]));

  const customerOpts = (customers ?? []).map((c) => ({
    id: c.id, name: c.name, category: (c.customer_categories as never as { name: string })?.name ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Orders to air. Create one here; scheduling the plays into breaks comes at the next stage."
        action={<NewCampaignButton
          customers={customerOpts as never} stations={(stations ?? []) as never}
          materials={(materials ?? []) as never} action={createCampaign} />}
      />

      {campErr && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load campaigns: {campErr.message}
        </div>
      )}

      <div className="mt-6">
        {!campaigns || campaigns.length === 0 ? (
          <EmptyState title="No campaigns yet" hint="Create the first order." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-neutral-500 border-b border-neutral-200">
                    <th className="px-4 py-2.5">No.</th>
                    <th className="px-4 py-2.5">Campaign</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Stn</th>
                    <th className="px-4 py-2.5">Run</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-brand">{c.number}</td>
                      <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                      <td className="px-4 py-3 text-neutral-600">{custName.get(String(c.customer_id)) ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{stnCode.get(String(c.station_id)) ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{c.start_date} → {c.end_date}</td>
                      <td className="px-4 py-3"><Badge tone={STATUS[c.status] ?? "neutral"}>{c.status}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <ActionForm action={deleteCampaign} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <button className="text-xs text-red-700 hover:underline">Delete</button>
                        </ActionForm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
