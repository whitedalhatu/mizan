import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchEcirsClientContracts } from "@/lib/ecirs";
import { DetailHeader, Card, Badge, EmptyState } from "../../ui";
import { EditCustomerButton } from "./EditCustomerButton";
import { ImportContractButton } from "./ImportContractButton";
import { importContractAsCampaign, updateCustomer } from "../actions";

export const dynamic = "force-dynamic";

function fmtNaira(n: number | null) { return n != null ? "₦" + new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(Math.round(n)) : "—"; }

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: cust } = await supabase
    .from("customers")
    .select("id, name, source, ecirs_client_id, category_id, contact_name, contact_phone, standing_spot_rate, customer_categories ( name )")
    .eq("id", params.id).maybeSingle();
  if (!cust) notFound();

  // This customer's existing MIZAN campaigns.
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, number, name, status, start_date, end_date, ecirs_contract_id")
    .eq("customer_id", cust.id)
    .order("created_at", { ascending: false });

  // MIZAN stations, for the import mapping.
  const { data: stations } = await supabase.from("stations").select("id, code, name").eq("active", true).order("code");
  const { data: categories } = await supabase.from("customer_categories").select("id, name").eq("active", true).order("name");

  // If linked to ECIRS, pull their contracts.
  let ecirsContracts: Awaited<ReturnType<typeof fetchEcirsClientContracts>> = null;
  let ecirsError = false;
  if (cust.ecirs_client_id) {
    ecirsContracts = await fetchEcirsClientContracts(cust.ecirs_client_id);
    if (ecirsContracts === null) ecirsError = true;
  }
  const importedIds = new Set((campaigns ?? []).map((c) => c.ecirs_contract_id).filter(Boolean));

  return (
    <div>
      <DetailHeader
        backHref="/customers"
        backLabel="Customers"
        title={cust.name}
        subtitle={cust.source === "ecirs" ? "Linked to an ECIRS client." : undefined}
        actions={
          <EditCustomerButton
            customer={{
              id: cust.id, name: cust.name,
              category_id: (cust as never as { category_id: string | null }).category_id,
              contact_name: (cust as never as { contact_name: string | null }).contact_name,
              contact_phone: (cust as never as { contact_phone: string | null }).contact_phone,
              standing_spot_rate: (cust as never as { standing_spot_rate: number | null }).standing_spot_rate,
            }}
            categories={(categories ?? []) as never}
            action={updateCustomer} />
        }
      />

      {(cust.customer_categories as never as { name: string })?.name && (
        <div className="mt-3"><Badge tone="accent">{(cust.customer_categories as never as { name: string }).name}</Badge></div>
      )}

      {/* ECIRS contracts (drill-in) */}
      {cust.ecirs_client_id && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-ink">Contracts in ECIRS</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Bring a contract in to start a MIZAN campaign — dates and the sold spot rate come across; you add the audio and hours here.</p>

          <div className="mt-4">
            {ecirsError ? (
              <Card className="p-4"><p className="text-sm text-red-700">Couldn&apos;t reach ECIRS. Check the connection in Settings.</p></Card>
            ) : !ecirsContracts || ecirsContracts.length === 0 ? (
              <EmptyState title="No contracts in ECIRS" hint="This client has no issued contracts to bring in." />
            ) : (
              <div className="space-y-3">
                {ecirsContracts.map((ct) => {
                  const already = importedIds.has(ct.id);
                  const rate = ct.lines.find((l) => l.unit_rate != null)?.unit_rate ?? null;
                  const totalSpots = ct.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
                  return (
                    <Card key={ct.id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                          <span className="font-medium text-ink">{ct.campaign_name}</span>
                          <span className="text-neutral-500">{ct.start_date} → {ct.end_date}</span>
                          {ct.station_code && <span className="font-mono text-xs">{ct.station_code}</span>}
                          <Badge tone="neutral">{ct.status}</Badge>
                          {totalSpots > 0 && <span className="text-xs text-neutral-500">{totalSpots} spots</span>}
                          {rate != null && <span className="text-xs text-neutral-500">{fmtNaira(rate)}/spot</span>}
                        </div>
                        {already ? (
                          <span className="text-xs text-brand">Already brought in</span>
                        ) : (
                          <ImportContractButton
                            customerId={cust.id}
                            ecirsClientId={cust.ecirs_client_id as string}
                            contract={{ id: ct.id, campaign_name: ct.campaign_name, station_code: ct.station_code }}
                            stations={(stations ?? []) as never}
                            action={importContractAsCampaign}
                          />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* This customer's MIZAN campaigns */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-ink">Campaigns <span className="text-neutral-400 font-normal">({(campaigns ?? []).length})</span></h2>
        <div className="mt-4">
          {(campaigns ?? []).length === 0 ? (
            <EmptyState title="No campaigns yet" />
          ) : (
            <Card className="divide-y divide-neutral-100">
              {(campaigns ?? []).map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 flex-wrap">
                  <span className="font-mono text-brand">{c.number}</span>
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-sm text-neutral-500">{c.start_date} → {c.end_date}</span>
                  {c.ecirs_contract_id && <Badge tone="brand">from ECIRS</Badge>}
                  <span className="ml-auto"><Badge tone={c.status === "active" ? "brand" : c.status === "completed" ? "success" : "neutral"}>{c.status}</Badge></span>
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
