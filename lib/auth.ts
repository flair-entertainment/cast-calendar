import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// All checks run on the server. The database (Row Level Security) is the real lock;
// these just send people to the right pages.

// Checks the login token's signature without a round trip to Supabase where possible.
async function currentUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  return c?.sub ? { id: c.sub as string, email: (c.email as string | undefined) ?? "" } : null;
}

export async function getSession() {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { supabase, user, isAdmin: Boolean(isAdmin) };
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s.user) redirect("/login");
  if (!s.isAdmin) redirect("/me");
  return s;
}

export async function requireCast() {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) redirect("/login");
  // Fetch both at once to save a round trip.
  const [{ data: isAdmin }, { data: member }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.from("cast_members").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!member) {
    if (isAdmin) redirect("/admin/cast");
    redirect("/login?error=not-on-roster");
  }
  return { supabase, user, isAdmin: Boolean(isAdmin), member };
}
