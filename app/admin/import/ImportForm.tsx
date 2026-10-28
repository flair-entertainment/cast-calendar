"use client";

import { useActionState, useState } from "react";
import { importCast } from "../actions";

type R = { ok: boolean; message: string; problems?: string[] } | null;

export function ImportForm() {
  const [csv, setCsv] = useState("");
  const [result, run, pending] = useActionState<R, FormData>(importCast, null);
  return (
    <form action={run} className="space-y-3">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }}
        className="block text-sm"
      />
      <textarea name="csv" value={csv} onChange={(e) => setCsv(e.target.value)} rows={12} className="w-full rounded-lg border border-line bg-white p-3 font-mono text-xs" placeholder="full_name,email,phone,role,location,skills" />
      <button disabled={pending || !csv.trim()} className="rounded-lg bg-char text-beige px-4 py-2 font-semibold disabled:opacity-40">{pending ? "Importing…" : "Import"}</button>
      {result && (
        <div className={`rounded-lg p-3 text-sm ${result.ok ? "bg-white border border-line" : "bg-red-50 text-red-800"}`}>
          <p className="font-medium">{result.message}</p>
          {result.problems?.length ? <ul className="mt-2 list-disc pl-5 text-red-800">{result.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        </div>
      )}
    </form>
  );
}
