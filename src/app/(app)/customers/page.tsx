import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, PageHeader, Card, Badge, EmptyState } from "../ui";
import { NewCustomerButton } from "./NewCustomerButton";
import { createCustomer, deleteCustomer, syncEcirsClients } from "./actions";
import { SyncEcirsButton } from "./SyncEcirsButton";


export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, contact_name, contact_phone, source, customer_categories ( name )")
    .order("name");
  const { data: categories } = await supabase
    .from("customer_categories").select("id, name").eq("active", true).order("name");

  return (
    <div>
      <PageHeader
        title="Customers"
        description="The advertisers you air campaigns for. Each belongs to a category, which is how MIZAN keeps competitors out of the same break."
        action={<div className="flex items-center gap-2"><SyncEcirsButton action={syncEcirsClients} /><NewCustomerButton categories={(categories ?? []) as never} action={createCustomer} /></div>}
      />
      <div className="mt-6">
        {!customers || customers.length === 0 ? (
          <EmptyState title="No customers yet" hint="Add the first advertiser." />
        ) : (
          <Card className="divide-y divide-neutral-100">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link href={`/customers/${c.id}`} className="font-medium text-ink hover:underline">{c.name}</Link>
                  {(c.customer_categories as never as { name: string })?.name && (
                    <Badge tone="accent">{(c.customer_categories as never as { name: string }).name}</Badge>
                  )}
                  {c.source === "ecirs" && <Badge tone="brand">from ECIRS</Badge>}
                  {c.contact_name && <span className="text-sm text-neutral-500">{c.contact_name}</span>}
                  {c.contact_phone && <span className="text-sm text-neutral-400">{c.contact_phone}</span>}
                </div>
                <ActionForm action={deleteCustomer} className="inline">
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-sm text-red-700 hover:underline">Delete</button>
                </ActionForm>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
