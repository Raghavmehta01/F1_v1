import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line)]">
      <div className="page-wrap flex flex-col gap-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-display text-2xl text-[var(--ink)]">F1_v1</p>
          <p className="max-w-sm text-sm text-[var(--muted)]">
            Fan-built race intelligence. Not affiliated with Formula 1
            companies.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
          <Link href="/standings" className="hover:text-[var(--ink)]">
            Standings
          </Link>
          <Link href="/calendar" className="hover:text-[var(--ink)]">
            Calendar
          </Link>
          <Link href="/live" className="hover:text-[var(--ink)]">
            Live
          </Link>
          <Link href="/chat" className="hover:text-[var(--ink)]">
            Chat
          </Link>
        </div>
      </div>
    </footer>
  );
}
