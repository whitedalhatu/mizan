"use client";

import { useState } from "react";
import { SegmentForm } from "./SegmentForm";
import { Modal, btn } from "../../ui";

type Result = { ok: boolean; message: string };
type Material = { id: string; name: string; duration_secs: number };

export function AddSegmentButton({
  campaignId, campaignStart, campaignEnd, materials, action,
}: {
  campaignId: string; campaignStart: string; campaignEnd: string;
  materials: Material[]; action: (fd: FormData) => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btn}>+ Add segment</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a segment" maxW="max-w-2xl"
        description="A scheduling pattern — when in the day, which days, which materials, how many plays.">
        <SegmentForm campaignId={campaignId} campaignStart={campaignStart} campaignEnd={campaignEnd}
          materials={materials} action={action} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
