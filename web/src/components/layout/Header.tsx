import Image from "next/image";
import Link from "next/link";
import { MusicToggle } from "@/components/layout/MusicToggle";
import { NavLinks } from "@/components/layout/NavLinks";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-md">
      <div className="page-wrap flex h-14 items-center justify-between gap-3 sm:h-16 sm:gap-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2 font-display text-[1.35rem] leading-none tracking-tight text-[var(--ink)] sm:gap-3 sm:text-[1.65rem]"
          aria-label="LapLedger home"
        >
          <Image
            src="/brand/lapledger-mark-v2.png"
            alt=""
            width={334}
            height={128}
            className="h-[1em] w-auto shrink-0 object-contain object-left transition-transform group-hover:scale-[1.02]"
            priority
            unoptimized
          />
          <span className="truncate">LapLedger</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLinks />
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <MusicToggle />
          <ThemeToggle />
        </div>
      </div>

      <nav
        className="page-wrap flex gap-4 overflow-x-auto pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="Primary"
      >
        <NavLinks mobile />
      </nav>
    </header>
  );
}
