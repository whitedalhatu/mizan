"use client";

import { useState } from "react";
import { EditBreakForm } from "./EditBreakForm";
import { Modal } from "../ui";

type Result = { ok: boolean; message: string };
type BreakData = {
  id: string; name: string; start_time: string; duration_secs: number;
  runs_mon: boolean; runs_tue: boolean; runs_wed: boolean; runs_thu: boolean;
  runs_fri: boolean; runs_sat: boolean; runs_sun: boolean;
};

export function EditBreakButton({ brk, action }: { brk: BreakData; action: (fd: FormData) => Promise<Result> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-brand hover:underline">Edit</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit break" maxW="max-w-xl">
        <EditBreakForm brk={brk} action={action} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
