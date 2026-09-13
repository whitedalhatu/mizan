"use client";

import { useState } from "react";
import { BreakForm } from "./BreakForm";
import { Modal, btn } from "../ui";

type Result = { ok: boolean; message: string };
type Station = { id: string; code: string; name: string };

export function NewBreakButton({ stations, action }: { stations: Station[]; action: (fd: FormData) => Promise<Result> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btn}>+ New break</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a break" maxW="max-w-2xl">
        <BreakForm stations={stations} action={action} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
