import { getTrackOutline } from "@/lib/media/track-outlines";

type Props = {
  circuitId?: string | null;
  label?: string;
  className?: string;
  /** compact = calendar row; hero = race / circuit pages */
  size?: "mini" | "thumb" | "hero";
};

/**
 * Themeable SVG track boundary — stroke follows --ink / --brand, not a fixed PNG.
 */
export function TrackOutline({
  circuitId,
  label,
  className = "",
  size = "thumb",
}: Props) {
  const track = getTrackOutline(circuitId);
  const box =
    size === "mini"
      ? "h-20 w-28"
      : size === "hero"
        ? "aspect-[4/3] w-full min-h-[14rem]"
        : "aspect-[4/3] w-full";

  return (
    <div
      className={`track-outline relative overflow-hidden bg-[var(--bg-elevated)] ${box} ${className}`}
      role="img"
      aria-label={label ?? track?.name ?? "Circuit map"}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 28% 35%, var(--brand) 0%, transparent 42%), repeating-linear-gradient(-18deg, transparent, transparent 14px, var(--line) 14px, var(--line) 15px)",
        }}
        aria-hidden
      />

      {track ? (
        <svg
          viewBox={track.viewBox}
          className={`absolute inset-0 h-full w-full ${
            size === "mini"
              ? "p-2.5"
              : label
                ? "p-3 pb-9 sm:p-4 sm:pb-10"
                : "p-3 sm:p-4"
          }`}
          fill="none"
          aria-hidden
        >
          {/* soft glow underlay */}
          <path
            d={track.d}
            className="track-outline-glow"
            stroke="var(--brand)"
            strokeWidth={size === "mini" ? 4.2 : 3.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.28}
          />
          <path
            d={track.d}
            className="track-outline-path"
            stroke="var(--ink)"
            strokeWidth={size === "mini" ? 2.2 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 flex items-end p-4">
          <p className="font-display text-lg leading-none text-[var(--muted)] sm:text-xl">
            {label ?? "Circuit"}
          </p>
        </div>
      )}

      {/* Mini thumbs stay map-only — calendar/list already shows the name beside them. */}
      {label && track && size !== "mini" ? (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg-elevated)] via-[color-mix(in_srgb,var(--bg-elevated)_85%,transparent)] to-transparent px-3 pb-2.5 pt-6 font-mono text-[10px] uppercase leading-snug tracking-[0.12em] text-[var(--muted)] sm:text-[11px]">
          <span className="line-clamp-2">{label}</span>
        </p>
      ) : null}
    </div>
  );
}
