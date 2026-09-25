"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, Field, Input, Select, btn, btnQuiet } from "../../ui";

type Result = { ok: boolean; message: string };
type Category = { id: string; name: string };
type Customer = {
  id: string; name: string; category_id: string | null;
  contact_name: string | null; contact_phone: string | null; standing_spot_rate: number | null;
};

export function EditCustomerButton({
  customer, categories, action,
}: { customer: Customer; categories: Category[]; action: (fd: FormData) => Promise<Result> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("id", customer.id);
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) { router.refresh(); setOpen(false); }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnQuiet}>Edit details</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit customer">
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" className="sm:col-span-2"><Input name="name" defaultValue={customer.name} required /></Field>
          <Field label="Category">
            <Select name="category_id" defaultValue={customer.category_id ?? ""}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Contact phone" optional><Input name="contact_phone" defaultValue={customer.contact_phone ?? ""} /></Field>
          <Field label="Contact name" optional className="sm:col-span-2"><Input name="contact_name" defaultValue={customer.contact_name ?? ""} /></Field>
          <Field label="Standing rate per spot (₦)" optional hint="Used for agency campaigns billed from what aired." className="sm:col-span-2">
            <Input name="standing_spot_rate" type="number" min={0} step={100} defaultValue={customer.standing_spot_rate ?? ""} />
          </Field>
          <div className="sm:col-span-2">
            <button className={btn} disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
          </div>
          {result && <p className={`sm:col-span-2 text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
        </form>
      </Modal>
    </>
  );
}
