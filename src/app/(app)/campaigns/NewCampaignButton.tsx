"use client";

import { useState } from "react";
import { CampaignForm } from "./CampaignForm";
import { Modal, btn } from "../ui";

type Result = { ok: boolean; message: string; id?: string };

export function NewCampaignButton({
  customers, stations, materials, action,
}: {
  customers: never[]; stations: never[]; materials: never[];
  action: (fd: FormData) => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btn}>+ New campaign</button>
      <Modal open={open} onClose={() => setOpen(false)} title="New campaign" maxW="max-w-3xl"
        description="Record an order to air. Scheduling the plays into breaks comes next, at Stage 2.">
        <CampaignForm customers={customers} stations={stations} materials={materials} action={action} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
