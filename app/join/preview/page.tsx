import { MyCalendar } from "./MyCal";
export default function P() {
  return <main className="mx-auto max-w-xl px-4 py-5"><MyCalendar memberId="x" month="2026-11" today="2026-10-30" rows={[]} weeks={[{ id: "w", cast_member_id: "x", days: [1,2,3,4,5], start_time: "09:00", end_time: "13:00", note: "Day job" }]} /></main>;
}
