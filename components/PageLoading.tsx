// Shown instantly while a page loads (e.g. after changing month), so taps feel responsive.
export function PageLoading({ dark = false }: { dark?: boolean }) {
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className={`h-1 w-full overflow-hidden ${dark ? "bg-char" : "bg-beige"}`}>
        <div className="h-full w-1/3 animate-[loading_1s_ease-in-out_infinite] bg-char" />
      </div>
      <div className="mx-auto mt-24 w-fit rounded-full bg-char px-4 py-2 text-sm text-beige shadow-lg">Loading…</div>
    </div>
  );
}
