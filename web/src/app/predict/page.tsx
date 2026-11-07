import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";

export default function PredictPage() {
  return (
    <div className="page-wrap space-y-10 py-16">
      <PageHeader
        eyebrow="Coming next"
        title="Predict"
        description="Win and podium chances for the next race weekend."
      />
      <div className="border border-[var(--line)] bg-[var(--bg-elevated)] p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Status
        </p>
        <p className="mt-3 text-lg text-[var(--ink)]">Predictions coming soon</p>
        <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
          Race probability models are not live yet. Check standings while you
          wait.
        </p>
        <Link href="/standings" className="btn-ghost mt-6 inline-flex">
          Check standings
        </Link>
      </div>
    </div>
  );
}
