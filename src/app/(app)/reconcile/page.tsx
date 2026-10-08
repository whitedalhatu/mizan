import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "../ui";
import { ReconcileForm } from "./ReconcileForm";
import { reconcileUpload } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReconcilePage() {
  const supabase = createClient();
  const { data: stations } = await supabase.from("stations").select("id, code, name").eq("active", true).order("code");
  const { data: runs } = await supabase
    .from("reconciliation_runs")
    .select("id, log_date, entries_count, matched_count, missed_count, unmatched_count, source, created_at, stations ( code )")
    .order("created_at", { ascending: false }).limit(10);

  return (
    <div>
      <PageHeader
        title="Reconcile airings"
        description="Match what actually aired against what MIZAN scheduled. Paste the RadioBOSS broadcast log here — later, the station agent does this automatically."
      />

      <div className="mt-6">
        <ReconcileForm stations={(stations ?? []) as never} action={reconcileUpload} />
      </div>

      {(runs ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-ink mb-3">Recent reconciliations</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-neutral-500 border-b border-neutral-200">
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Station</th>
                  <th className="px-4 py-2.5">Log date</th>
                  <th className="px-4 py-2.5 text-right">Entries</th>
                  <th className="px-4 py-2.5 text-right">Matched</th>
                  <th className="px-4 py-2.5 text-right">Missed</th>
                  <th className="px-4 py-2.5 text-right">Unmatched</th>
                  <th className="px-4 py-2.5">Via</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(runs ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-neutral-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{(r.stations as never as { code: string })?.code ?? "—"}</td>
                    <td className="px-4 py-2.5">{r.log_date ?? "multiple"}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.entries_count}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{r.matched_count}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-700">{r.missed_count}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-neutral-400">{r.unmatched_count}</td>
                    <td className="px-4 py-2.5 text-xs text-neutral-400">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
