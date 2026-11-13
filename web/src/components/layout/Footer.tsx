import Image from "next/image";
import Link from "next/link";

const LINKEDIN = "https://www.linkedin.com/in/raghavmehta1/";
const YEAR = 2026;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line)]">
      <div className="page-wrap space-y-8 py-10 sm:py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 font-display text-2xl leading-none tracking-tight text-[var(--ink)] sm:gap-3">
              <Image
                src="/brand/pitwall-mark-v2.png"
                alt=""
                width={334}
                height={128}
                className="h-[1em] w-auto object-contain"
                unoptimized
              />
              <span>Pitwall</span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
              Fan-made race intelligence — standings, live timing, and regs
              chat. Independent open-source project; nothing to do with the
              FIA, Formula 1 companies, or teams.
            </p>
            <p className="text-sm text-[var(--ink)]">
              Developed by{" "}
              <a
                href={LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline decoration-[var(--line)] underline-offset-4 transition-colors hover:text-[var(--brand)] hover:decoration-[var(--brand)]"
              >
                Raghav Mehta
              </a>
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] sm:justify-end">
            <Link href="/standings" className="hover:text-[var(--ink)]">
              Standings
            </Link>
            <Link href="/calendar" className="hover:text-[var(--ink)]">
              Calendar
            </Link>
            <Link href="/live" className="hover:text-[var(--ink)]">
              Live
            </Link>
            <Link href="/battle" className="hover:text-[var(--ink)]">
              Battle
            </Link>
            <Link href="/chat" className="hover:text-[var(--ink)]">
              Chat
            </Link>
            <a
              href={LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--ink)]"
            >
              LinkedIn
            </a>
          </div>
        </div>

        <div className="space-y-3 border-t border-[var(--line)] pt-6 text-xs leading-relaxed text-[var(--muted)]">
          <p>
            © {YEAR} Raghav Mehta. Pitwall is open source under the Apache
            License 2.0. Copyright and attribution notices must be retained
            (see LICENSE and NOTICE).
          </p>
          <p>
            Fan-made only — not an official Formula 1 product and has nothing
            to do with the FIA, Formula 1 companies, teams, or drivers. Formula
            1, F1, Grand Prix, related names, and logos are trademarks of
            Formula One Licensing B.V. and/or their respective owners. FIA
            sporting and technical regulations remain © Fédération
            Internationale de l&apos;Automobile. Official imagery from the
            Formula 1 media CDN remains property of its rights holders and is
            shown for editorial / fan display only — not redistributed from this
            project.
          </p>
          <p>
            Timing and results data via{" "}
            <a
              href="https://github.com/jolpica/jolpica-f1"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--ink)]"
            >
              Jolpica
            </a>{" "}
            and{" "}
            <a
              href="https://openf1.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--ink)]"
            >
              OpenF1
            </a>
            . Not affiliated with, endorsed by, or associated with Formula 1
            companies, the FIA, teams, or drivers.
          </p>
          <p>
            Connect:{" "}
            <a
              href={LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--brand)]"
            >
              linkedin.com/in/raghavmehta1
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
