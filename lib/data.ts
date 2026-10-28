import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvailabilityRow, WeekRow } from "@/lib/availability";

// Supabase returns at most 1,000 rows per request, so read in pages.
async function pages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export function getAvailability(sb: SupabaseClient, fromDate: string, toDate: string, ids?: string[]) {
  return pages<AvailabilityRow>((a, b) => {
    let q = sb
      .from("availability")
      .select("cast_member_id, date, status, start_time, end_time, note")
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date")
      .order("cast_member_id");
    if (ids) q = q.in("cast_member_id", ids);
    return q.range(a, b);
  });
}

export function getWeeks(sb: SupabaseClient, ids?: string[]) {
  return pages<WeekRow>((a, b) => {
    let q = sb.from("regular_week").select("id, cast_member_id, days, start_time, end_time, note").order("id");
    if (ids) q = q.in("cast_member_id", ids);
    return q.range(a, b);
  });
}

export type CastMember = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  roles: string[];
  location: string | null;
  skills: string[];
  active: boolean;
  is_test: boolean;
  last_updated: string;
};

export function getCast(sb: SupabaseClient, opts: { ids?: string[]; activeOnly?: boolean } = {}) {
  return pages<CastMember>((a, b) => {
    let q = sb.from("cast_members").select("*").order("full_name").order("id");
    if (opts.ids) q = q.in("id", opts.ids);
    if (opts.activeOnly) q = q.eq("active", true);
    return q.range(a, b);
  });
}
