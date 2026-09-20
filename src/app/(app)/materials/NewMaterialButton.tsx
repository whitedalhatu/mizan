"use client";

import { useState } from "react";
import { MaterialUploadForm } from "./MaterialUploadForm";
import { Modal, btn } from "../ui";

type Result = { ok: boolean; message: string };

export function NewMaterialButton({ action }: { action: (fd: FormData) => Promise<Result> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btn}>+ New material</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a material"
        description="Upload the audio spot. MIZAN stores it and reads its length automatically.">
        <MaterialUploadForm action={action} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
