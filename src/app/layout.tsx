import type { Metadata } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { deriveThemeVars } from "@/lib/theme";

export async function generateMetadata(): Promise<Metadata> {
  const { orgName } = await getSettings();
  return {
    title: `MIZAN \u2014 ${orgName}`,
    description: "Broadcast traffic and scheduling",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Operator's brand colours become CSS variables here, before render — no
  // flash, no rebuild. Every brand/accent class in the app follows.
  const { primaryColor, accentColor } = await getSettings();
  const vars = deriveThemeVars(primaryColor, accentColor);
  const themeStyle = Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(" ");

  return (
    <html lang="en">
      <head>
        <style>{`:root { ${themeStyle} }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
