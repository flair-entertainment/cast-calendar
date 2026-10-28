import { CastNav } from "@/components/CastNav";
import { requireCast } from "@/lib/auth";
import { daysLabel, hhmm } from "@/lib/availability";
import { WeekForm, RemoveButton } from "./WeekForm";

export default async function MyWeek() {
  const { supabase, member } = await requireCast();
  const { data: rows } = await supabase
    .from("regular_week")
    .select("id, days, start_time, end_time, note")
    .eq("cast_member_id", member.id)
    .order("created_at");

  return (
    <>
      <CastNav active="/me/week" name={member.full_name} />
      <main className="mx-auto max-w-xl px-4 py-5 space-y-5">
        <div>
          <h1 className="font-serif text-xl">My regular week</h1>
          <p className="text-sm text-muted">Times you're never free each week, like a day job or classes. This helps the team plan rehearsals around you.</p>
        </div>
        <ul className="divide-y divide-line rounded-xl bg-white border border-line">
          {(rows ?? []).length === 0 && <li className="p-4 text-sm text-muted">Nothing added. You're free any time unless you mark a date.</li>}
          {(rows ?? []).map((r) => (
            <li key={r.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{r.note || "Regular commitment"}</div>
                <div className="text-sm text-muted">{daysLabel(r.days)} · {hhmm(r.start_time)} to {hhmm(r.end_time)}</div>
              </div>
              <RemoveButton id={r.id} />
            </li>
          ))}
        </ul>
        <WeekForm />
      </main>
    </>
  );
}
