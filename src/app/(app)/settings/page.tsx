import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { ActionForm, Field, Input, PageHeader, Card, btn } from "../ui";
import { updateSettings, saveEcirsConnection, testEcirs } from "./actions";
import { TestEcirsButton } from "./TestEcirsButton";

export default async function SettingsPage() {
  if (!(await getIdentity())) redirect("/login");
  const settings = await getSettings();
  const admin = createAdminClient();
  const { data: raw } = await admin.from("platform_settings").select("ecirs_url").eq("id", true).maybeSingle();

  return (
    <div>
      <PageHeader title="Settings" />

      <Card className="mt-6 p-5">
        <h2 className="text-base font-semibold text-ink">Identity &amp; appearance</h2>
        <p className="text-sm text-neutral-500 mt-1">Your organisation name and brand colours. Colours apply across MIZAN immediately after saving.</p>
        <ActionForm action={updateSettings} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Organisation name" className="sm:col-span-2">
            <Input name="org_name" defaultValue={settings.orgName} required />
          </Field>
          <div className="block">
            <span className="text-sm font-medium text-ink">Brand colours</span>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-2">
                <input type="color" name="primary_color" defaultValue={settings.primaryColor}
                  className="h-9 w-12 rounded-lg border border-neutral-300 bg-white p-0.5 cursor-pointer" />
                <span className="text-xs text-neutral-500">Primary</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="color" name="accent_color" defaultValue={settings.accentColor}
                  className="h-9 w-12 rounded-lg border border-neutral-300 bg-white p-0.5 cursor-pointer" />
                <span className="text-xs text-neutral-500">Accent</span>
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 sm:col-span-2 text-sm">
            <input type="checkbox" name="inherit_ecirs_theme" defaultChecked={settings.inheritEcirsTheme} />
            When connected to ECIRS, match ECIRS&apos;s colours automatically
          </label>
          <div className="sm:col-span-2"><button className={btn}>Save settings</button></div>
        </ActionForm>
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="text-base font-semibold text-ink">ECIRS connection</h2>
        <p className="text-sm text-neutral-500 mt-1 max-w-2xl leading-relaxed">
          MIZAN runs on its own, but when connected to a specific ECIRS it can import stations, campaigns and
          contract details, and push airing proof back. Enter the connection here; the live link is switched on
          in a later stage.
        </p>
        <ActionForm action={saveEcirsConnection} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ECIRS address"><Input name="ecirs_url" defaultValue={raw?.ecirs_url ?? ""} placeholder="https://ecirs.example.com" /></Field>
          <Field label="Connection key"><Input name="ecirs_api_key" type="password" placeholder="••••••" /></Field>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className={btn}>Save ECIRS details</button>
            <span className={`text-xs ${settings.ecirsConnected ? "text-brand" : "text-neutral-400"}`}>
              {settings.ecirsConnected ? "● Connected" : "○ Not connected yet"}
            </span>
          </div>
        </ActionForm>
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <TestEcirsButton action={testEcirs} />
          <p className="text-xs text-neutral-400 mt-1">Save the address and key first, then test — MIZAN checks ECIRS accepts the key.</p>
        </div>
      </Card>
    </div>
  );
}
