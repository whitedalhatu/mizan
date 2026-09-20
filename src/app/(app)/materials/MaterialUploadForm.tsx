"use client";

import { useState, useRef, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, btn } from "../ui";

type Result = { ok: boolean; message: string };

function fmt(s: number) { const m = Math.floor(s / 60), sec = Math.round(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; }

// Upload a material's audio: pick the file, MIZAN reads its duration from the
// file itself (override if needed), uploads it to storage, then records details.
export function MaterialUploadForm({
  action, onDone,
}: { action: (fd: FormData) => Promise<Result>; onDone?: () => void }) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(f: File | null) {
    setFile(f); setFileName(f?.name ?? "");
    if (f && !name) setName(f.name);
    setResult(null);
    if (!f) { setDuration(0); return; }
    const url = URL.createObjectURL(f);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => { if (isFinite(audio.duration)) setDuration(Math.round(audio.duration)); URL.revokeObjectURL(url); };
    audio.onerror = () => URL.revokeObjectURL(url);
    audio.src = url;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const form = e.currentTarget as HTMLFormElement;
    if (!file) { setResult({ ok: false, message: "Choose an audio file first." }); return; }
    if (!duration || duration <= 0) { setResult({ ok: false, message: "Could not read the duration — enter it below." }); return; }

    setUploading(true);
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("materials").upload(path, file, {
      contentType: file.type || "audio/mpeg", upsert: false,
    });
    setUploading(false);
    if (upErr) { setResult({ ok: false, message: "Upload failed: " + upErr.message }); return; }

    const fd = new FormData();
    fd.set("name", name || file.name);
    fd.set("duration_secs", String(duration));
    fd.set("cart_number", (form.elements.namedItem("cart_number") as HTMLInputElement)?.value ?? "");
    fd.set("audio_path", path);
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) {
        setFile(null); setFileName(""); setName(""); setDuration(0);
        if (fileRef.current) fileRef.current.value = "";
        onDone?.();
      } else {
        await supabase.storage.from("materials").remove([path]); // roll back orphan
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <span className="text-sm font-medium text-ink">Audio file</span>
        <div className="mt-1 flex items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Choose audio</button>
          <span className="text-sm text-neutral-500 truncate max-w-[16rem]">{fileName || "No file chosen"}</span>
          {duration > 0 && <span className="text-xs text-brand font-mono">{fmt(duration)}</span>}
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="7 KEYS HERBAL PIDGIN 22.mp3" /></Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Duration (seconds)" hint={duration ? "Read from the file — change if needed." : "Enter if it couldn't be read."}>
          <Input type="number" min={1} value={duration || ""} onChange={(e) => setDuration(Number(e.target.value))} />
        </Field>
        <Field label="Cart number" optional hint="The playout system's reference.">
          <Input name="cart_number" />
        </Field>
      </div>

      <button className={btn} disabled={pending || uploading}>
        {uploading ? "Uploading…" : pending ? "Saving…" : "Add material"}
      </button>
      {result && <p className={`text-sm ${result.ok ? "text-brand" : "text-red-700"}`}>{result.message}</p>}
    </form>
  );
}
