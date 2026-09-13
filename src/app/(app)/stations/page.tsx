import { createClient } from "@/lib/supabase/server";
import { ActionForm, PageHeader, Card, Badge, EmptyState } from "../ui";
import { NewStationButton } from "./NewStationButton";
import { createStation, setStationActive, deleteStation } from "./actions";

const PLAYOUT_LABEL: Record<string, string> = { none: "Not connected", radioboss: "RadioBOSS", other: "Other" };

export default async function StationsPage() {
  const supabase = createClient();
  const { data: stations } = await supabase
    .from("stations")
    .select("id, code, name, frequency, playout_type, playout_status, active, identity_source")
    .order("code");

  return (
    <div>
      <PageHeader
        title="Stations"
        description="A station in MIZAN is its identity plus a connection to its playout system. When MIZAN is connected to ECIRS, station details are imported — you'd then only set the playout link."
        action={<NewStationButton action={createStation} />}
      />

      <div className="mt-6">
        {!stations || stations.length === 0 ? (
          <EmptyState title="No stations yet" hint="Add the first one." />
        ) : (
          <div className="space-y-2">
            {stations.map((s) => (
              <Card key={s.id} className={`flex items-center justify-between gap-3 flex-wrap p-4 ${s.active ? "" : "border-amber-300 bg-amber-50"}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-semibold text-ink">{s.code}</span>
                  <span className="text-ink">{s.name}</span>
                  {s.frequency && <span className="text-sm text-neutral-500">{s.frequency}</span>}
                  <Badge tone={s.playout_type === "none" ? "neutral" : "accent"}>{PLAYOUT_LABEL[s.playout_type] ?? s.playout_type}</Badge>
                  {s.identity_source === "ecirs" && <Badge tone="brand">from ECIRS</Badge>}
                  {!s.active && <Badge tone="warning">inactive</Badge>}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <ActionForm action={setStationActive} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={s.active ? "false" : "true"} />
                    <button className="text-brand hover:underline">{s.active ? "Deactivate" : "Reactivate"}</button>
                  </ActionForm>
                  <ActionForm action={deleteStation} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-red-700 hover:underline">Delete</button>
                  </ActionForm>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
