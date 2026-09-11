import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { ActionForm, inputCls, btnCls } from "../Forms";
import { updateSettings, saveEcirsConnection } from "./actions";

export default async function SettingsPage() {
  if (!(await getIdentity())) redirect("/login");
  const settings = await getSettings();

  // Read the raw ECIRS fields (not in getSettings' typed shape) for the form.
  const admin = createAdminClient();
  const { data: raw } = await admin
    .from("platform_settings").select("ecirs_url").eq("id", true).maybeSingle();

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-brand rule-accent inline-block">Settings</h1>

      <section className="rounded-lg border border-brand-mist bg-white p-5">
        <h2 className="font-semibold text-brand">Identity &amp; appearance</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Your organisation name and brand colours. Colours apply across MIZAN
          immediately after saving.
        </p>
        <ActionForm action={updateSettings} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Organisation name</span>
            <input name="org_name" defaultValue={settings.orgName} required className={inputCls} />
          </label>
          <div className="block">
            <span className="text-sm font-medium">Brand colours</span>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-2">
                <input type="color" name="primary_color" defaultValue={settings.primaryColor}
                  className="h-9 w-12 rounded border border-neutral-300 bg-white p-0.5 cursor-pointer" />
                <span className="text-xs text-neutral-500">Primary</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="color" name="accent_color" defaultValue={settings.accentColor}
                  className="h-9 w-12 rounded border border-neutral-300 bg-white p-0.5 cursor-pointer" />
                <span className="text-xs text-neutral-500">Accent</span>
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 sm:col-span-2 text-sm">
            <input type="checkbox" name="inherit_ecirs_theme" defaultChecked={settings.inheritEcirsTheme} />
            When connected to ECIRS, match ECIRS&apos;s colours automatically
          </label>
          <div className="sm:col-span-2">
            <button className={btnCls}>Save settings</button>
          </div>
        </ActionForm>
      </section>

      <section className="rounded-lg border border-brand-mist bg-white p-5">
        <h2 className="font-semibold text-brand">ECIRS connection</h2>
        <p className="text-sm text-neutral-600 mt-1">
          MIZAN runs on its own, but when connected to a specific ECIRS it can
          import stations, campaigns and contract details, and push airing proof
          back. Enter the connection here; the live link is switched on in a
          later stage.
        </p>
        <ActionForm action={saveEcirsConnection} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">ECIRS address</span>
            <input name="ecirs_url" defaultValue={raw?.ecirs_url ?? ""} placeholder="https://ecirs.example.com" className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Connection key</span>
            <input name="ecirs_api_key" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022" className={inputCls} />
          </label>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className={btnCls}>Save ECIRS details</button>
            <span className={`text-xs ${settings.ecirsConnected ? "text-brand" : "text-neutral-400"}`}>
              {settings.ecirsConnected ? "\u25CF Connected" : "\u25CB Not connected yet"}
            </span>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
