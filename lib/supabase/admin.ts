import "server-only";
import { createClient } from "@supabase/supabase-js";

// Secret "service role" client. It bypasses Row Level Security, so:
// - only ever import this in server code (the "server-only" import above enforces it)
// - only call it after checking the person is a manager (requireAdmin), or for login checks.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
