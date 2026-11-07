import Link from "next/link";
import { TrackOutline } from "@/components/race/TrackOutline";
import { getCircuit } from "@/lib/data/jolpica";
import { parseId } from "@/lib/security/validation";
import { notFound } from "next/navigation";

export const revalidate = 86400;

type Props = { params: Promise<{ id: string }> };

export default async function CircuitPage({ params }: Props) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) notFound();
  const circuit = (await getCircuit(id)) as {
    circuitName?: string;
    Location?: {
      locality?: string;
      country?: string;
      lat?: string;
      long?: string;
    };
  } | null;
  if (!circuit) notFound();

  return (
    <div className="page-wrap space-y-10 py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
        <div className="space-y-4">
          <p className="eyebrow">Circuit</p>
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">
            {circuit.circuitName}
          </h1>
          <p className="text-lg text-[var(--muted)]">
            {circuit.Location?.locality}, {circuit.Location?.country}
          </p>
          {circuit.Location?.lat && circuit.Location?.long ? (
            <p className="font-mono text-sm text-[var(--muted)]">
              {circuit.Location.lat}, {circuit.Location.long}
            </p>
          ) : null}
        </div>
        <TrackOutline
          circuitId={id}
          label={circuit.circuitName}
          size="hero"
          className="border border-[var(--line)]"
        />
      </div>
      <Link href="/calendar" className="btn-ghost inline-flex">
        Season calendar
      </Link>
    </div>
  );
}
