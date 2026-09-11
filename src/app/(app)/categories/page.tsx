import { createClient } from "@/lib/supabase/server";
import { ActionForm, inputCls, btnCls } from "../Forms";
import { createCategory, deleteCategory } from "./actions";

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("customer_categories").select("id, name, description").order("name");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-brand rule-accent inline-block">Customer categories</h1>
        <p className="text-sm text-neutral-600 mt-4 max-w-2xl">
          Business categories &mdash; Telecoms, Banks, Detergent, and so on. Two
          customers in the same category are competitors, and later MIZAN will
          keep them out of the same commercial break.
        </p>
      </div>

      <section className="rounded-lg border border-brand-mist bg-white p-5 max-w-xl">
        <h2 className="font-semibold text-brand mb-3">Add a category</h2>
        <ActionForm action={createCategory} className="space-y-3" resetOnSuccess>
          <label className="block">
            <span className="text-sm font-medium">Name</span>
            <input name="name" placeholder="Telecommunications" required className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Description <span className="text-neutral-400">(optional)</span></span>
            <input name="description" className={inputCls} />
          </label>
          <button className={btnCls}>Add category</button>
        </ActionForm>
      </section>

      <section>
        <h2 className="font-semibold text-brand mb-3">Categories {categories?.length ? `(${categories.length})` : ""}</h2>
        {!categories || categories.length === 0 ? (
          <p className="text-sm text-neutral-500">No categories yet.</p>
        ) : (
          <div className="space-y-2 max-w-xl">
            {categories.map((c) => (
              <div key={c.id} className="rounded border border-neutral-200 bg-white p-3 flex items-center justify-between gap-3">
                <div>
                  <span className="font-medium">{c.name}</span>
                  {c.description && <span className="text-sm text-neutral-500 ml-2">{c.description}</span>}
                </div>
                <ActionForm action={deleteCategory} className="inline">
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-sm text-red-700 hover:underline">Delete</button>
                </ActionForm>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
