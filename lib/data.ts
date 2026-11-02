import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvailabilityRow, Rehearsal, WeekRow } from "@/lib/availability";

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
  confirmed: boolean;
  self_signup: boolean;
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

// Rehearsals between two dates, with the ids of who's called.
// For a performer, the database only returns rehearsals they're called to (and only their own id).
export async function getRehearsals(sb: SupabaseClient, fromDate: string, toDate: string, ids?: string[]): Promise<Rehearsal[]> {
  type Raw = Omit<Rehearsal, "cast"> & { rehearsal_cast: { cast_member_id: string }[] };
  let raw: Raw[];
  try {
    raw = await pages<Raw>((a, b) =>
    sb
      .from("rehearsals")
      .select("id, title, date, start_time, end_time, location, notes, rehearsal_cast(cast_member_id)")
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date")
      .order("start_time")
      .order("id")
      .range(a, b),
    );
  } catch (e) {
    // e.g. the rehearsals table hasn't been added yet: show none rather than break the page.
    console.error("getRehearsals failed", e);
    return [];
  }
  const out = raw.map(({ rehearsal_cast, ...r }) => ({ ...r, cast: rehearsal_cast.map((x) => x.cast_member_id) }));
  return ids ? out.filter((r) => r.cast.some((c) => ids.includes(c))) : out;
}
