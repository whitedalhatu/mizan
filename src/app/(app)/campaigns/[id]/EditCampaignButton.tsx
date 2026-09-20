"use client";

import { useState } from "react";
import { EditCampaignForm } from "./EditCampaignForm";
import { Modal, btnQuiet } from "../../ui";

type Result = { ok: boolean; message: string };

export function EditCampaignButton({
  campaign, customers, stations, action,
}: {
  campaign: never; customers: never[]; stations: never[];
  action: (fd: FormData) => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btnQuiet}>Edit details</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit campaign" maxW="max-w-2xl">
        <EditCampaignForm campaign={campaign} customers={customers} stations={stations} action={action} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
