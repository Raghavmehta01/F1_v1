"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/standings", label: "Standings" },
  { href: "/live", label: "Live" },
  { href: "/battle", label: "Battle" },
  { href: "/history", label: "History" },
  { href: "/predict", label: "Predict" },
  { href: "/chat", label: "Chat" },
];

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((l) => {
        const active =
          pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              mobile
                ? `whitespace-nowrap text-[10px] uppercase tracking-[0.16em] ${
                    active ? "text-[var(--ink)]" : "text-[var(--muted)]"
                  }`
                : `relative text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? "text-[var(--ink)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`
            }
          >
            {l.label}
            {active && !mobile ? (
              <span className="absolute -bottom-1 left-0 h-px w-full bg-[var(--brand)]" />
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
