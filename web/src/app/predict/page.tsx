import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function PredictPage() {
  return (
    <div className="page-wrap space-y-10 py-16">
      <PageHeader
        eyebrow="Machine learning · coming next"
        title="Predict"
        description="LightGBM win and podium probabilities for the next race. Held until chat and deploy are done."
      />
      <div className="border border-[var(--line)] bg-[var(--bg-elevated)] p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Status
        </p>
        <p className="mt-3 text-lg text-[var(--ink)]">Model pipeline on hold</p>
        <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
          The FastAPI stub is ready. Training and the ranked probability UI ship
          last.
        </p>
        <Link href="/standings" className="btn-ghost mt-6 inline-flex">
          Check standings
        </Link>
      </div>
    </div>
  );
}
