"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; message: string };

export async function createCategory(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { ok: false, message: "Give the category a name." };
  const supabase = createClient();
  const { error } = await supabase.from("customer_categories").insert({ name, description: description || null });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: false, message: `"${name}" already exists.` };
    return { ok: false, message: error.message };
  }
  revalidatePath("/categories");
  return { ok: true, message: `Category "${name}" added.` };
}

export async function deleteCategory(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing category." };
  const supabase = createClient();
  const { error } = await supabase.from("customer_categories").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/categories");
  return { ok: true, message: "Category removed." };
}
