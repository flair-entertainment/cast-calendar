import { CastNav } from "@/components/CastNav";
import { requireCast } from "@/lib/auth";
import { addDays, hhmm, shortDate, todayLondon } from "@/lib/availability";
import { getRehearsals } from "@/lib/data";

// The performer's own rehearsals. The database only returns ones they're called to.
export default async function MyRehearsals() {
  const { supabase, member } = await requireCast();
  const today = todayLondon();
  const list = await getRehearsals(supabase, today, addDays(today, 365));

  return (
    <>
      <CastNav active="/me/rehearsals" name={member.full_name} />
      <main className="mx-auto max-w-xl px-4 py-5">
        <h1 className="mb-4 font-serif text-2xl">My rehearsals</h1>
        {!list.length && <p className="rounded-xl border border-line bg-white p-6 text-center text-muted">No rehearsals yet. When Flair calls you to one, it shows here and on your calendar.</p>}
        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <b>{shortDate(r.date)}</b>
                <span className="text-sm">{hhmm(r.start_time)}–{hhmm(r.end_time)}</span>
              </div>
              <div className="mt-1 font-medium">{r.title}</div>
              {r.location && <div className="text-sm text-muted">{r.location}</div>}
              {r.notes && <p className="mt-2 whitespace-pre-line rounded-lg bg-sand p-2 text-sm">{r.notes}</p>}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
