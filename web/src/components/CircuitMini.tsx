import { TrackOutline } from "@/components/TrackOutline";

export function CircuitMini({
  circuitId,
  alt,
}: {
  circuitId?: string | null;
  /** @deprecated raster maps replaced by themeable outlines */
  src?: string | null | undefined;
  alt: string;
}) {
  return (
    <TrackOutline
      circuitId={circuitId}
      label={alt}
      size="mini"
      className="hidden border border-[var(--line)] sm:block"
    />
  );
}
