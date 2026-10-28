// Build a link that keeps the current filters and changes a few.
export function qs(base: string, params: Record<string, string | undefined>, changes: Record<string, string | undefined> = {}) {
  const merged = { ...params, ...changes };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") sp.set(k, v);
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}
