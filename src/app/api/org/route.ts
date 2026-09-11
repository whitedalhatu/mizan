import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { orgName } = await getSettings();
  return NextResponse.json({ orgName });
}
