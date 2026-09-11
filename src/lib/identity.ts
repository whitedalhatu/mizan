import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Identity = {
  userId: string;
  email: string;
} | null;

// Stage 0 keeps identity minimal: is someone signed in, and who. Roles arrive
// with the campaign/scheduling stages, mirroring how ECIRS layered them in.
export async function getIdentity(): Promise<Identity> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, email: user.email ?? "" };
}
