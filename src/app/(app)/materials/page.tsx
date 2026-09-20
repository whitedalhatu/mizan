import { createClient } from "@/lib/supabase/server";
import { ActionForm, PageHeader, Card, Badge, EmptyState } from "../ui";
import { NewMaterialButton } from "./NewMaterialButton";
import { createMaterial, deleteMaterial } from "./actions";

function fmt(s: number) { const m = Math.floor(s / 60), sec = Math.round(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; }


export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const supabase = createClient();
  const { data: materials } = await supabase
    .from("materials").select("id, name, duration_secs, cart_number, audio_path").order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Materials"
        description="The audio spots your campaigns air. MIZAN stores each file so it can be pushed to the playout system when scheduled."
        action={<NewMaterialButton action={createMaterial} />}
      />
      <div className="mt-6">
        {!materials || materials.length === 0 ? (
          <EmptyState title="No materials yet" hint="Upload the first audio spot." />
        ) : (
          <Card className="divide-y divide-neutral-100">
            {materials.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-brand text-sm">{fmt(m.duration_secs)}</span>
                  <span className="font-medium text-ink">{m.name}</span>
                  {m.cart_number && <Badge tone="neutral">cart {m.cart_number}</Badge>}
                  {m.audio_path ? <Badge tone="success">audio stored</Badge> : <Badge tone="warning">no audio</Badge>}
                </div>
                <ActionForm action={deleteMaterial} className="inline">
                  <input type="hidden" name="id" value={m.id} />
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
