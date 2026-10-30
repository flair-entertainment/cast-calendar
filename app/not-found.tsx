import Link from "next/link";

// Shown for any address that doesn't exist (e.g. a typo or an old link).
export default function NotFound() {
  return (
    <main className="min-h-screen bg-char flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-sand p-6 text-center shadow-xl">
        <div className="font-serif text-2xl tracking-[0.2em]">FLAIR</div>
        <h1 className="mt-1 mb-4 text-muted">Cast Calendar</h1>
        <p className="mb-5 text-sm">That page doesn&apos;t exist. The link may be old or mistyped.</p>
        <div className="space-y-2">
          <Link href="/login" className="block rounded-lg bg-char py-3 font-semibold text-beige">Log in</Link>
          <Link href="/join" className="block rounded-lg border border-char py-3 font-medium">New performer? Sign up</Link>
        </div>
      </div>
    </main>
  );
}
