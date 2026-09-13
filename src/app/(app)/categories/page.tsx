import { createClient } from "@/lib/supabase/server";
import { ActionForm, Field, Input, PageHeader, Card, EmptyState, btn } from "../ui";
import { NewCategoryButton } from "./NewCategoryButton";
import { createCategory, deleteCategory } from "./actions";

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("customer_categories").select("id, name, description").order("name");

  return (
    <div>
      <PageHeader
        title="Customer categories"
        description="Business categories — Telecoms, Banks, Detergent, and so on. Two customers in the same category are competitors, and later MIZAN keeps them out of the same commercial break."
        action={<NewCategoryButton action={createCategory} />}
      />

      <div className="mt-6">
        {!categories || categories.length === 0 ? (
          <EmptyState title="No categories yet" hint="Add the first one." />
        ) : (
          <Card className="divide-y divide-neutral-100">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <span className="font-medium text-ink">{c.name}</span>
                  {c.description && <span className="text-sm text-neutral-500 ml-2">{c.description}</span>}
                </div>
                <ActionForm action={deleteCategory} className="inline">
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
