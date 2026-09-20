import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/identity";
import { getSettings } from "@/lib/settings";
import { Shell } from "./Shell";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/campaigns", label: "Campaigns", icon: "campaigns" },
  { href: "/customers", label: "Customers", icon: "customers" },
  { href: "/materials", label: "Materials", icon: "materials" },
  { href: "/air-log", label: "Air log", icon: "airlog" },
  { href: "/stations", label: "Stations", icon: "stations" },
  { href: "/breaks", label: "Breaks", icon: "breaks" },
  { href: "/categories", label: "Categories", icon: "categories" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const { orgName, ecirsConnected } = await getSettings();

  return (
    <Shell orgName={orgName} email={identity.email} ecirsConnected={ecirsConnected} nav={NAV}>
      {children}
    </Shell>
  );
}
