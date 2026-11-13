import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-wrap flex flex-col items-start gap-5 py-24">
      <p className="eyebrow">404</p>
      <h1 className="font-display text-5xl tracking-tight sm:text-6xl">
        Off track
      </h1>
      <p className="max-w-md text-lg text-[var(--muted)]">
        That page is not on the calendar.
      </p>
      <Link href="/" className="btn-primary">
        Back to LapLedger
      </Link>
    </div>
  );
}
