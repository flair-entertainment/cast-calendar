import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { hhmm, todayLondon } from "@/lib/availability";
import { getCast } from "@/lib/data";
import { RehearsalForm } from "../RehearsalForm";

export default async function EditRehearsal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: r }, cast] = await Promise.all([
    supabase.from("rehearsals").select("*, rehearsal_cast(cast_member_id)").eq("id", id).maybeSingle(),
    getCast(supabase),
  ]);
  if (!r) notFound();
  const called: string[] = (r.rehearsal_cast ?? []).map((x: { cast_member_id: string }) => x.cast_member_id);
  // Active cast, plus anyone already called who has since been switched off.
  const people = cast.filter((c) => c.active || called.includes(c.id)).map((c) => ({ id: c.id, name: c.full_name }));
  return (
    <>
      <AdminNav active="/admin/rehearsals" />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-4 font-serif text-3xl">Edit rehearsal</h1>
        <RehearsalForm
          cast={people}
          today={todayLondon()}
          initial={{ id: r.id, title: r.title, date: r.date, start: hhmm(r.start_time), end: hhmm(r.end_time), location: r.location ?? "", notes: r.notes ?? "", cast: called }}
        />
      </main>
    </>
  );
}
