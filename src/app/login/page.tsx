"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/org").then((r) => r.json()).then((d) => setOrgName(d.orgName ?? "")).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email or password not recognised.");
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-paper">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs tracking-[0.25em] text-accent font-semibold">
          {orgName ? orgName.toUpperCase() : "\u00A0"}
        </p>
        <h1 className="text-center font-display text-3xl text-brand mt-1">MIZAN</h1>
        <p className="text-center text-sm text-neutral-500 mb-8">Broadcast traffic &amp; scheduling</p>

        <form onSubmit={onSubmit} className="space-y-4 bg-white border border-brand-mist rounded-lg p-6">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm" disabled={busy} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm" disabled={busy} />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-deep disabled:opacity-50">
            {busy ? "Signing in\u2026" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
