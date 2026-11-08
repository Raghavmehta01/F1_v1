import Image from "next/image";
import Link from "next/link";
import { MusicToggle } from "@/components/layout/MusicToggle";
import { NavLinks } from "@/components/layout/NavLinks";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-md">
      <div className="page-wrap flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-display text-[1.5rem] leading-none tracking-tight text-[var(--ink)] sm:gap-3 sm:text-[1.65rem]"
          aria-label="Pitwall home"
        >
          <Image
            src="/brand/pitwall-mark-v2.png"
            alt=""
            width={334}
            height={128}
            className="h-[1em] w-auto object-contain object-left transition-transform group-hover:scale-[1.02]"
            priority
            unoptimized
          />
          <span>Pitwall</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex max-w-[36vw] items-center gap-4 overflow-x-auto md:hidden">
            <NavLinks mobile />
          </nav>
          <MusicToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
