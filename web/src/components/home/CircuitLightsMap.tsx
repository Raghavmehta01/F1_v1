"use client";

import { useEffect, useState } from "react";
import { getTrackOutline } from "@/lib/media/track-outlines";

type Props = {
  circuitId?: string | null;
  label?: string;
  className?: string;
};

/**
 * Circuit outline with a moving light along the path (SVG pathLength + dash).
 */
export function CircuitLightsMap({
  circuitId,
  label,
  className = "",
}: Props) {
  const track = getTrackOutline(circuitId);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div
      className={`circuit-lights-map relative aspect-[4/3] h-full w-full overflow-hidden bg-[var(--bg-soft)] ${className}`}
      role="img"
      aria-label={label ?? track?.name ?? "Circuit map"}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 70% 40%, color-mix(in srgb, var(--brand) 35%, transparent) 0%, transparent 55%), repeating-linear-gradient(-14deg, transparent, transparent 16px, var(--line) 16px, var(--line) 17px)",
        }}
        aria-hidden
      />

      {track ? (
        <svg
          viewBox={track.viewBox}
          className="absolute inset-0 h-full w-full p-4 sm:p-6"
          fill="none"
          aria-hidden
        >
          <path
            d={track.d}
            pathLength={100}
            stroke="var(--brand)"
            strokeWidth={3.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.22}
          />
          <path
            d={track.d}
            pathLength={100}
            className="track-outline-path"
            stroke="var(--ink)"
            strokeWidth={1.85}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
          {motionOk ? (
            <>
              <path
                d={track.d}
                pathLength={100}
                className="circuit-light-trail"
                stroke="var(--live)"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle r="2.1" className="circuit-light-head" fill="var(--live)">
                <animateMotion
                  dur="7.5s"
                  repeatCount="indefinite"
                  path={track.d}
                  rotate="auto"
                />
              </circle>
            </>
          ) : (
            <path
              d={track.d}
              pathLength={100}
              stroke="var(--live)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.45}
            />
          )}
        </svg>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Map unavailable
          </p>
        </div>
      )}

      {label ? (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg-soft)] via-[color-mix(in_srgb,var(--bg-soft)_88%,transparent)] to-transparent px-4 pb-3 pt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <span className="line-clamp-2">{label}</span>
        </p>
      ) : null}
    </div>
  );
}
