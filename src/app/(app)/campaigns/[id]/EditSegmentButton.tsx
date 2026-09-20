"use client";

import { useState } from "react";
import { EditSegmentForm } from "./EditSegmentForm";
import { Modal } from "../../ui";

type Result = { ok: boolean; message: string };

export function EditSegmentButton({
  seg, campaignId, campaignStart, campaignEnd, materials, action,
}: {
  seg: never; campaignId: string; campaignStart: string; campaignEnd: string;
  materials: never[]; action: (fd: FormData) => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-brand hover:underline">Edit</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit segment" maxW="max-w-2xl">
        <EditSegmentForm seg={seg} campaignId={campaignId} campaignStart={campaignStart}
          campaignEnd={campaignEnd} materials={materials} action={action} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
