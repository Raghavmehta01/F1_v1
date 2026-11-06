"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-wrap flex flex-col items-start gap-5 py-24">
      <p className="eyebrow text-[var(--brand)]">Red flag</p>
      <h1 className="font-display text-5xl tracking-tight sm:text-6xl">
        Session interrupted
      </h1>
      <p className="max-w-lg text-lg text-[var(--muted)]">
        {error.message || "Something went wrong loading this page."}
      </p>
      <button type="button" onClick={reset} className="btn-ghost">
        Retry
      </button>
    </div>
  );
}
