"use client";

import { useEffect, useState } from "react";
import { getTrackOutline } from "@/lib/media/track-outlines";

type Props = {
  circuitId?: string | null;
  label?: string;
  /** Compact board strip vs full hero center. */
  variant?: "board" | "hero";
  className?: string;
};

/**
 * Circuit outline with a moving light along the path (SVG pathLength + dash).
 */
export function CircuitLightsMap({
  circuitId,
  label,
  variant = "board",
  className = "",
}: Props) {
  const track = getTrackOutline(circuitId);
  const [motionOk, setMotionOk] = useState(true);
  const hero = variant === "hero";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div
      className={`circuit-lights-map relative h-full w-full overflow-hidden ${
        hero ? "bg-transparent" : "aspect-[4/3] bg-[var(--bg-soft)]"
      } ${className}`}
      role="img"
      aria-label={label ?? track?.name ?? "Circuit map"}
    >
      {!hero ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 40%, color-mix(in srgb, var(--brand) 35%, transparent) 0%, transparent 55%), repeating-linear-gradient(-14deg, transparent, transparent 16px, var(--line) 16px, var(--line) 17px)",
          }}
          aria-hidden
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 55% at 50% 48%, color-mix(in srgb, var(--ink) 6%, transparent) 0%, transparent 70%)",
          }}
          aria-hidden
        />
      )}

      {track ? (
        <svg
          viewBox={track.viewBox}
          className={`absolute inset-0 h-full w-full ${
            hero ? "p-6 sm:p-8 lg:p-10" : "p-4 sm:p-6"
          }`}
          fill="none"
          aria-hidden
        >
          <path
            d={track.d}
            pathLength={100}
            stroke="var(--ink)"
            strokeWidth={hero ? 6 : 3.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={hero ? 0.06 : 0.22}
          />
          <path
            d={track.d}
            pathLength={100}
            className="track-outline-path"
            stroke="var(--ink)"
            strokeWidth={hero ? 1.15 : 1.85}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={hero ? 0.72 : 0.85}
          />
          {motionOk ? (
            <>
              <path
                d={track.d}
                pathLength={100}
                className={
                  hero ? "circuit-light-trail circuit-light-trail--hero" : "circuit-light-trail"
                }
                stroke={hero ? "var(--brand)" : "var(--live)"}
                strokeWidth={hero ? 1.35 : 2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle
                r={hero ? 1.6 : 2.1}
                className={
                  hero ? "circuit-light-head circuit-light-head--hero" : "circuit-light-head"
                }
                fill={hero ? "var(--brand)" : "var(--live)"}
              >
                <animateMotion
                  dur={hero ? "11s" : "7.5s"}
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
              stroke={hero ? "var(--brand)" : "var(--live)"}
              strokeWidth={hero ? 1.2 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.4}
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
        <p
          className={`absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] ${
            hero
              ? "bg-gradient-to-t from-[var(--bg)] via-[color-mix(in_srgb,var(--bg)_70%,transparent)] to-transparent text-center"
              : "bg-gradient-to-t from-[var(--bg-soft)] via-[color-mix(in_srgb,var(--bg-soft)_88%,transparent)] to-transparent"
          }`}
        >
          <span className="line-clamp-2">{label}</span>
        </p>
      ) : null}
    </div>
  );
}
