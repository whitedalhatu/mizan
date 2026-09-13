"use client";

import { useState } from "react";
import { StationForm } from "./StationForm";
import { Modal, btn } from "../ui";

type Result = { ok: boolean; message: string };

export function NewStationButton({ action }: { action: (fd: FormData) => Promise<Result> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btn}>+ New station</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a station" maxW="max-w-2xl">
        <StationForm action={action} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
