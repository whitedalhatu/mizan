"use client";

import { useState } from "react";
import { Modal, ActionForm, Field, Input, Select, btn } from "../ui";

type Result = { ok: boolean; message: string };
type Category = { id: string; name: string };

export function NewCustomerButton({ categories, action }: { categories: Category[]; action: (fd: FormData) => Promise<Result> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btn}>+ New customer</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a customer">
        <ActionForm action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSuccess={() => setOpen(false)}>
          <Field label="Name" className="sm:col-span-2"><Input name="name" placeholder="3RIPPLE J&amp;M" required /></Field>
          <Field label="Category">
            <Select name="category_id" defaultValue="">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Contact phone" optional><Input name="contact_phone" /></Field>
          <Field label="Contact name" optional className="sm:col-span-2"><Input name="contact_name" /></Field>
          <div className="sm:col-span-2"><button className={btn}>Add customer</button></div>
        </ActionForm>
      </Modal>
    </>
  );
}
