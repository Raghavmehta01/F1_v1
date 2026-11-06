import { TrackOutline } from "@/components/TrackOutline";

type Props = {
  circuitId?: string | null;
  /** @deprecated raster maps replaced by themeable outlines */
  src?: string | null | undefined;
  alt: string;
  flagSrc?: string | null;
  className?: string;
};

/** Server component — themeable circuit outline for race / detail headers. */
export function CircuitThumb({ circuitId, alt, className = "" }: Props) {
  return (
    <TrackOutline
      circuitId={circuitId}
      label={alt}
      size="thumb"
      className={`border border-[var(--line)] ${className}`}
    />
  );
}
