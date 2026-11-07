import { TrackOutline } from "@/components/race/TrackOutline";

export function CircuitMini({
  circuitId,
}: {
  circuitId?: string | null;
  /** @deprecated raster maps replaced by themeable outlines */
  src?: string | null | undefined;
  /** Kept for call-site compatibility; mini maps no longer overlay text. */
  alt: string;
}) {
  return (
    <TrackOutline
      circuitId={circuitId}
      size="mini"
      className="hidden border border-[var(--line)] sm:block"
    />
  );
}
