"use client";

import { useEffect, useMemo, useState } from "react";
import { getCircuitAnnotation } from "@/lib/media/circuit-annotations";
import {
  centeredSquareViewBox,
  findPathCorners,
  tightViewBox,
} from "@/lib/media/path-geometry";
import { getTrackOutline } from "@/lib/media/track-outlines";

type Props = {
  circuitId?: string | null;
  label?: string;
  /** Compact board strip vs full hero center. */
  variant?: "board" | "hero";
  className?: string;
};

type TurnPin = {
  key: string;
  n: number;
  name?: string;
  x: number;
  y: number;
  lx: number;
  ly: number;
  anchor: "start" | "middle" | "end";
};

/**
 * Circuit outline with a moving light along the path (SVG pathLength + dash).
 * Hero variant fills the column and overlays turn / landmark labels when known.
 */
export function CircuitLightsMap({
  circuitId,
  label,
  variant = "board",
  className = "",
}: Props) {
  const track = getTrackOutline(circuitId);
  const ann = getCircuitAnnotation(circuitId);
  const [motionOk, setMotionOk] = useState(true);
  const hero = variant === "hero";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const turns = useMemo<TurnPin[]>(() => {
    if (!track) return [];
    if (ann?.namedTurns?.length) {
      return ann.namedTurns.map((t) => {
        const lx = t.lx ?? t.x;
        const ly = t.ly ?? t.y - 4.5;
        return {
          key: `n-${t.n}`,
          n: t.n,
          name: t.name,
          x: t.x,
          y: t.y,
          lx,
          ly,
          anchor: t.anchor ?? "middle",
        };
      });
    }
    const corners = findPathCorners(track.d, {
      minAngleDeg: hero ? 32 : 38,
      minSpacing: 5.2,
      maxTurns: ann?.turns ? Math.min(ann.turns, 16) : 12,
    });
    return corners.map((c, i) => {
      // Push labels farther off the outline than the apex pin.
      const dx = c.lx - c.x;
      const dy = c.ly - c.y;
      const len = Math.hypot(dx, dy) || 1;
      const push = 5.2;
      return {
        key: `a-${c.index}`,
        n: i + 1,
        x: c.x,
        y: c.y,
        lx: c.x + (dx / len) * push,
        ly: c.y + (dy / len) * push,
        anchor: "middle" as const,
      };
    });
  }, [track, ann, hero]);

  const metaBits = [
    ann?.lengthKm != null ? `${ann.lengthKm.toFixed(3)} km` : null,
    ann?.turns != null ? `${ann.turns} turns` : turns.length ? `${turns.length} turns` : null,
    ann?.drsZones != null ? `${ann.drsZones} DRS` : null,
  ].filter(Boolean);

  const viewBox = useMemo(() => {
    if (!track) return "0 0 100 100";
    if (hero) return centeredSquareViewBox(track.d, 0.2, track.viewBox);
    return tightViewBox(track.d, 4, track.viewBox);
  }, [track, hero]);

  return (
    <div
      className={`circuit-lights-map relative mx-auto overflow-hidden ${
        hero ? "bg-transparent" : "aspect-[4/3] h-full w-full bg-[var(--bg-soft)]"
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
              "radial-gradient(ellipse 75% 60% at 50% 46%, color-mix(in srgb, var(--ink) 5%, transparent) 0%, transparent 72%)",
          }}
          aria-hidden
        />
      )}

      {track ? (
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className={`absolute inset-0 h-full w-full ${
            hero ? "p-2 pb-11" : "p-4 sm:p-6"
          }`}
          fill="none"
          aria-hidden
        >
          <path
            d={track.d}
            pathLength={100}
            stroke="var(--ink)"
            strokeWidth={hero ? 6.2 : 3.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={hero ? 0.08 : 0.22}
          />
          <path
            d={track.d}
            pathLength={100}
            className="track-outline-path"
            stroke="var(--ink)"
            strokeWidth={hero ? 1.55 : 1.85}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={hero ? 0.86 : 0.85}
          />
          {motionOk ? (
            <>
              <path
                d={track.d}
                pathLength={100}
                className={
                  hero
                    ? "circuit-light-trail circuit-light-trail--hero"
                    : "circuit-light-trail"
                }
                stroke={hero ? "var(--brand)" : "var(--live)"}
                strokeWidth={hero ? 1.55 : 2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle
                r={hero ? 1.7 : 2.1}
                className={
                  hero
                    ? "circuit-light-head circuit-light-head--hero"
                    : "circuit-light-head"
                }
                fill={hero ? "var(--brand)" : "var(--live)"}
              >
                <animateMotion
                  dur={hero ? "12s" : "7.5s"}
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

          {ann?.startFinish ? (
            <g>
              <line
                x1={ann.startFinish.x - 2.4}
                y1={ann.startFinish.y - 1.8}
                x2={ann.startFinish.x + 2.4}
                y2={ann.startFinish.y + 1.8}
                stroke="var(--ink)"
                strokeWidth={0.65}
                opacity={0.95}
              />
              <line
                x1={ann.startFinish.x - 2.4}
                y1={ann.startFinish.y + 1.8}
                x2={ann.startFinish.x + 2.4}
                y2={ann.startFinish.y - 1.8}
                stroke="var(--ink)"
                strokeWidth={0.65}
                opacity={0.55}
              />
              <text
                x={ann.startFinish.x}
                y={ann.startFinish.y + 4.6}
                textAnchor="middle"
                fill="var(--muted)"
                style={{
                  fontSize: 2.7,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  letterSpacing: "0.08em",
                }}
              >
                S/F
              </text>
            </g>
          ) : null}

          {hero &&
            ann?.landmarks?.map((lm) => (
              <text
                key={lm.label}
                x={lm.x}
                y={lm.y}
                textAnchor={lm.anchor ?? "middle"}
                fill="var(--muted)"
                opacity={0.9}
                stroke="var(--bg)"
                strokeWidth={0.9}
                paintOrder="stroke"
                style={{
                  fontSize: 2.55,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {lm.label}
              </text>
            ))}

          {hero
            ? turns.map((t) => {
                const named = Boolean(t.name);
                const labelAway =
                  Math.hypot(t.lx - t.x, t.ly - t.y) > 1.2;
                return (
                  <g key={t.key}>
                    {named && labelAway ? (
                      <line
                        x1={t.x}
                        y1={t.y}
                        x2={t.lx}
                        y2={t.ly}
                        stroke="var(--line-strong)"
                        strokeWidth={0.35}
                        opacity={0.7}
                      />
                    ) : null}
                    <circle
                      cx={t.x}
                      cy={t.y}
                      r={1.25}
                      fill="var(--bg)"
                      stroke="var(--ink)"
                      strokeWidth={0.5}
                      opacity={0.95}
                    />
                    <text
                      x={t.x}
                      y={t.y + 0.9}
                      textAnchor="middle"
                      fill="var(--ink)"
                      style={{
                        fontSize: 2.2,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontWeight: 600,
                      }}
                    >
                      {t.n}
                    </text>
                    {t.name ? (
                      <text
                        x={t.lx}
                        y={t.ly}
                        textAnchor={t.anchor}
                        fill="var(--ink)"
                        opacity={0.78}
                        stroke="var(--bg)"
                        strokeWidth={1.1}
                        paintOrder="stroke"
                        style={{
                          fontSize: 2.4,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {t.name}
                      </text>
                    ) : null}
                  </g>
                );
              })
            : null}
        </svg>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Map unavailable
          </p>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 space-y-1 px-4 pb-3 pt-8 ${
          hero
            ? "bg-gradient-to-t from-[var(--bg)] via-[color-mix(in_srgb,var(--bg)_75%,transparent)] to-transparent text-center"
            : "bg-gradient-to-t from-[var(--bg-soft)] via-[color-mix(in_srgb,var(--bg-soft)_88%,transparent)] to-transparent"
        }`}
      >
        {label ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            <span className="line-clamp-2">{label}</span>
          </p>
        ) : null}
        {hero && metaBits.length ? (
          <p className="font-mono text-[10px] tracking-[0.14em] text-[color-mix(in_srgb,var(--muted)_85%,var(--ink))]">
            {metaBits.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
