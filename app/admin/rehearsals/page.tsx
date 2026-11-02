import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { addDays, hhmm, shortDate, todayLondon } from "@/lib/availability";
import { getCast, getRehearsals } from "@/lib/data";

export default async function Rehearsals({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
  const { past } = await searchParams;
  const { supabase } = await requireAdmin();
  const today = todayLondon();
  const [list, cast] = await Promise.all([
    past ? getRehearsals(supabase, addDays(today, -90), addDays(today, -1)) : getRehearsals(supabase, today, addDays(today, 365)),
    getCast(supabase),
  ]);
  const name = new Map(cast.map((c) => [c.id, c.full_name]));
  const shown = past ? [...list].reverse() : list;

  return (
    <>
      <AdminNav active="/admin/rehearsals" />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl">{past ? "Past rehearsals" : "Rehearsals"}</h1>
          <div className="flex items-center gap-3">
            <Link href={past ? "/admin/rehearsals" : "/admin/rehearsals?past=1"} className="text-sm underline text-muted">{past ? "Upcoming" : "Past"}</Link>
            <Link href="/admin/rehearsals/new" className="rounded-lg bg-char px-4 py-2 font-semibold text-beige">Add rehearsal</Link>
          </div>
        </div>

        {!shown.length && <p className="rounded-xl border border-line bg-white p-6 text-center text-muted">{past ? "No rehearsals in the last 90 days." : "No rehearsals coming up."}</p>}

        <div className="space-y-2">
          {shown.map((r) => (
            <Link key={r.id} href={`/admin/rehearsals/${r.id}`} className="flex gap-4 rounded-xl border border-line bg-white p-4 hover:border-char">
              <div className="w-28 shrink-0">
                <div className="font-semibold">{shortDate(r.date)}</div>
                <div className="text-sm text-muted">{hhmm(r.start_time)}–{hhmm(r.end_time)}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{r.title}{r.location && <span className="font-normal text-muted"> · {r.location}</span>}</div>
                <div className="mt-1 text-sm text-muted">{r.cast.map((id) => name.get(id) ?? "Removed").sort().join(", ")}</div>
              </div>
              <div className="shrink-0 self-center text-sm text-muted">{r.cast.length} called ›</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
