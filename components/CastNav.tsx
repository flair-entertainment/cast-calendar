import Link from "next/link";
import { SignOut } from "./SignOut";

const tabs = [
  { href: "/me", label: "My availability" },
  { href: "/me/week", label: "My regular week" },
  { href: "/me/details", label: "My details" },
];

export function CastNav({ active, name }: { active: string; name: string }) {
  return (
    <header className="bg-char text-white">
      <div className="mx-auto max-w-xl px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <div className="font-serif text-beige text-xl tracking-[0.2em]">FLAIR</div>
          <div className="text-xs text-beige/70">Hi {name.split(" ")[0]}</div>
        </div>
        <SignOut dark />
      </div>
      <nav className="mx-auto max-w-xl px-2 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap px-3 py-2 text-sm rounded-t-lg ${active === t.href ? "bg-sand text-ink font-medium" : "text-beige/80"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
