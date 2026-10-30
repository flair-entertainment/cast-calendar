import { WeekView } from "../../admin/compare/WeekView";
import type { PersonData } from "../../admin/compare/CompareGrid";
import { range } from "@/lib/availability";
export default function P() {
  const days = range("2026-11-02", 7);
  const r = (id: string, date: string, status: "unavailable" | "maybe", note: string | null, s: string | null = null, e: string | null = null) => ({ cast_member_id: id, date, status, start_time: s, end_time: e, note });
  const people: PersonData[] = [
    { id: "a", name: "Ava Morgan", desc: "", isNew: false, rows: { "2026-11-04": r("a", "2026-11-04", "unavailable", "Dentist", "14:00", "18:00"), "2026-11-06": r("a", "2026-11-06", "unavailable", "Holiday") }, weeks: [] },
    { id: "b", name: "Ben Okafor", desc: "", isNew: false, rows: {}, weeks: [{ cast_member_id: "b", days: [1,2,3,4,5], start_time: "09:00", end_time: "17:00", note: "Day job" }] },
    { id: "c", name: "Chloe Hart", desc: "", isNew: false, rows: { "2026-11-05": r("c", "2026-11-05", "unavailable", null, "19:00", "22:00") }, weeks: [{ cast_member_id: "c", days: [2,4], start_time: "18:00", end_time: "21:00", note: "Classes" }] },
  ];
  return <div className="p-4 bg-sand min-h-screen"><WeekView ids={["a","b","c"]} days={days} people={people} today="2026-10-30" nav={{ prev: "2026-10-26", next: "2026-11-09", today: "2026-10-26" }} /></div>;
}
