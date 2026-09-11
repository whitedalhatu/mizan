import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../Forms";
import { StationForm } from "./StationForm";
import { createStation, setStationActive, deleteStation } from "./actions";

const PLAYOUT_LABEL: Record<string, string> = {
  none: "Not connected",
  radioboss: "RadioBOSS",
  other: "Other",
};

export default async function StationsPage() {
  const supabase = createClient();
  const { data: stations } = await supabase
    .from("stations")
    .select("id, code, name, frequency, playout_type, playout_status, active, identity_source")
    .order("code");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-brand rule-accent inline-block">Stations</h1>
        <p className="text-sm text-neutral-600 mt-4 max-w-2xl">
          A station in MIZAN is its identity plus a connection to its playout
          system. You can create one here, and when MIZAN is connected to ECIRS,
          station details are imported &mdash; you&apos;d then only set the playout link.
        </p>
      </div>

      <section className="rounded-lg border border-brand-mist bg-white p-5">
        <h2 className="font-semibold text-brand mb-3">Add a station</h2>
        <StationForm action={createStation} />
      </section>

      <section>
        <h2 className="font-semibold text-brand mb-3">
          Stations {stations?.length ? `(${stations.length})` : ""}
        </h2>
        {!stations || stations.length === 0 ? (
          <p className="text-sm text-neutral-500">No stations yet. Add the first one above.</p>
        ) : (
          <div className="space-y-2">
            {stations.map((s) => (
              <div key={s.id}
                className={`rounded border p-3 flex items-center justify-between gap-3 flex-wrap ${
                  s.active ? "border-neutral-200 bg-white" : "border-amber-300 bg-amber-50"}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-semibold">{s.code}</span>
                  <span>{s.name}</span>
                  {s.frequency && <span className="text-sm text-neutral-500">{s.frequency}</span>}
                  <span className={`text-xs rounded-full px-2 py-0.5 ${
                    s.playout_type === "none" ? "bg-neutral-100 text-neutral-500" : "bg-accent-soft text-brand-deep"}`}>
                    {PLAYOUT_LABEL[s.playout_type] ?? s.playout_type}
                  </span>
                  {s.identity_source === "ecirs" && (
                    <span className="text-xs rounded-full bg-brand-mist text-brand px-2 py-0.5">from ECIRS</span>
                  )}
                  {!s.active && <span className="text-xs rounded-full bg-amber-600 text-white px-2 py-0.5">inactive</span>}
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
