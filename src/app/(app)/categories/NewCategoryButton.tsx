"use client";

import { useState } from "react";
import { Modal, ActionForm, Field, Input, btn } from "../ui";

type Result = { ok: boolean; message: string };

export function NewCategoryButton({ action }: { action: (fd: FormData) => Promise<Result> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btn}>+ New category</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a category">
        <ActionForm action={action} className="space-y-4" onSuccess={() => setOpen(false)}>
          <Field label="Name"><Input name="name" placeholder="Telecommunications" required /></Field>
          <Field label="Description" optional><Input name="description" /></Field>
          <button className={btn}>Add category</button>
        </ActionForm>
      </Modal>
    </>
  );
}
