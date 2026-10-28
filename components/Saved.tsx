"use client";
export function Saved({ show, text = "Saved" }: { show: boolean; text?: string }) {
  return (
    <div
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-char text-beige px-5 py-2 text-sm shadow-lg transition-opacity ${show ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      ✓ {text}
    </div>
  );
}
