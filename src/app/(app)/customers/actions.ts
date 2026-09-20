"use server";

import { getIdentity } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; message: string };

export async function createCustomer(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  if (!name) return { ok: false, message: "Customer name is required." };

  const supabase = createClient();
  const { error } = await supabase.from("customers").insert({
    name, category_id: categoryId || null,
    contact_name: contactName || null, contact_phone: contactPhone || null,
    source: "mizan",
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: false, message: `"${name}" already exists.` };
    return { ok: false, message: error.message };
  }
  revalidatePath("/customers");
  return { ok: true, message: `Customer "${name}" added.` };
}

export async function deleteCustomer(formData: FormData): Promise<Result> {
  if (!(await getIdentity())) return { ok: false, message: "Please sign in." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing customer." };
  const supabase = createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    if (/foreign key|violates/i.test(error.message))
      return { ok: false, message: "This customer has campaigns — remove those first." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/customers");
  return { ok: true, message: "Customer removed." };
}
