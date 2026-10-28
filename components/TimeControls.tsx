import { TIME_WINDOWS } from "@/lib/config";

// "Time needed" picker. A plain form (GET), so it works without JavaScript.
export function TimeControls({ hidden, win, cs, ce }: { hidden: Record<string, string | undefined>; win: string; cs?: string; ce?: string }) {
  return (
    <form className="flex flex-wrap items-end gap-2">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="text-xs uppercase tracking-wide text-muted">
        Time needed
        <select name="win" defaultValue={win} className="mt-1 block rounded-lg border border-line bg-white px-2 py-1.5 text-sm normal-case tracking-normal text-ink">
          {Object.entries(TIME_WINDOWS).map(([k, w]) => (
            <option key={k} value={k}>{w.label} ({w.start} to {w.end})</option>
          ))}
          <option value="custom">Custom hours</option>
        </select>
      </label>
      <label className="text-xs uppercase tracking-wide text-muted">From<input type="time" name="cs" defaultValue={cs ?? "18:00"} className="mt-1 block rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink" /></label>
      <label className="text-xs uppercase tracking-wide text-muted">To<input type="time" name="ce" defaultValue={ce ?? "21:00"} className="mt-1 block rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink" /></label>
      <button className="rounded-lg bg-char text-beige px-3 py-1.5 text-sm">Apply</button>
      <span className="text-xs text-muted self-center">(From/To only used for custom hours)</span>
    </form>
  );
}
