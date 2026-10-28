import Link from "next/link";
import { SignOut } from "./SignOut";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/cast", label: "Cast list" },
  { href: "/admin/compare", label: "Compare" },
  { href: "/admin/import", label: "Add cast" },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <header className="bg-char text-white">
      <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <div className="font-serif text-beige text-xl tracking-[0.2em]">FLAIR</div>
        <nav className="flex flex-wrap gap-1 flex-1">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-1.5 rounded-lg text-sm ${active === t.href ? "bg-beige text-ink font-medium" : "text-beige/80 hover:text-white"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <SignOut dark />
      </div>
    </header>
  );
}
