import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { todayLondon } from "@/lib/availability";
import { getCast } from "@/lib/data";
import { RehearsalForm } from "../RehearsalForm";

type SP = { ids?: string; date?: string; start?: string };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function NewRehearsal({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const cast = await getCast(supabase, { activeOnly: true });
  const ids = (sp.ids ?? "").split(",").filter((x) => UUID.test(x));
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : "";
  const start = sp.start && /^\d{2}:\d{2}$/.test(sp.start) ? sp.start : "";
  const end = start ? `${String(Math.min(23, Number(start.slice(0, 2)) + 2)).padStart(2, "0")}${start.slice(2)}` : "";
  return (
    <>
      <AdminNav active="/admin/rehearsals" />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-4 font-serif text-3xl">Add rehearsal</h1>
        <RehearsalForm
          cast={cast.map((c) => ({ id: c.id, name: c.full_name }))}
          today={todayLondon()}
          initial={{ title: "", date, start, end, location: "", notes: "", cast: ids }}
        />
      </main>
    </>
  );
}
