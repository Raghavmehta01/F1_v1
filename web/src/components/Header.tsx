import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-md">
      <div className="page-wrap flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="font-display group flex items-center gap-3 text-[1.65rem] leading-none text-[var(--ink)]"
        >
          <span
            className="h-6 w-[3px] bg-[var(--brand)] transition-transform group-hover:scale-y-125"
            aria-hidden
          />
          F1_v1
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-4">
          <nav className="flex max-w-[42vw] items-center gap-4 overflow-x-auto md:hidden">
            <NavLinks mobile />
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
