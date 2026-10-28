import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// All checks run on the server. The database (Row Level Security) is the real lock;
// these just send people to the right pages.

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const s = await getSession();
  if (!s.user) redirect("/login");
  const { data: member } = await s.supabase
    .from("cast_members")
    .select("*")
    .eq("user_id", s.user.id)
    .maybeSingle();
  if (!member) {
    if (s.isAdmin) redirect("/admin");
    redirect("/login?error=not-on-roster");
  }
  return { ...s, member };
}
