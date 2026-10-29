import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { todayLondon } from "@/lib/availability";
import { getCast } from "@/lib/data";
import { CastTable } from "./CastTable";

export default async function CastList({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: showNew } = await searchParams;
  const { supabase } = await requireAdmin();
  const cast = await getCast(supabase);
  return (
    <>
      <AdminNav active="/admin/cast" />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="font-serif text-3xl mb-4">Cast list</h1>
        <CastTable cast={cast} today={todayLondon()} startNewOnly={showNew === "1"} />
      </main>
    </>
  );
}
