"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lapledger-start-lights-seen";
const LIGHT_COUNT = 5;
/** ms between each lamp lighting */
const LIGHT_STAGGER_MS = 380;
/** hold all five on before lights-out */
const HOLD_MS = 520;
/** fade overlay after lights out */
const FADE_MS = 700;

type Phase = "arming" | "lighting" | "held" | "out" | "done";

/**
 * Classic five-red start gantry on first visit this session.
 * Skip with click / Esc; respects prefers-reduced-motion.
 */
export function StartLightsIntro() {
  const [phase, setPhase] = useState<Phase>("done");
  const [lit, setLit] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || sessionStorage.getItem(STORAGE_KEY) === "1") {
      setPhase("done");
      return;
    }
    setVisible(true);
    setPhase("arming");
    const t = window.setTimeout(() => setPhase("lighting"), 280);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "lighting") return;
    if (lit >= LIGHT_COUNT) {
      setPhase("held");
      return;
    }
    const delay = lit === 0 ? 40 : LIGHT_STAGGER_MS;
    const t = window.setTimeout(() => setLit((n) => n + 1), delay);
    return () => window.clearTimeout(t);
  }, [phase, lit]);

  useEffect(() => {
    if (phase !== "held") return;
    const t = window.setTimeout(() => setPhase("out"), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "out") return;
    sessionStorage.setItem(STORAGE_KEY, "1");
    const t = window.setTimeout(() => {
      setVisible(false);
      setPhase("done");
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "done") return;
    const skip = () => {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setPhase("out");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "done" && !visible) return null;

  const lightsOut = phase === "out" || phase === "done";
  const fading = phase === "out";

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg)] transition-opacity duration-700 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Race start sequence"
      onClick={() => {
        sessionStorage.setItem(STORAGE_KEY, "1");
        setPhase("out");
      }}
    >
      <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
        Start sequence
      </p>

      <div
        className="flex items-end gap-3 sm:gap-4"
        aria-hidden
      >
        {Array.from({ length: LIGHT_COUNT }, (_, i) => {
          const on = !lightsOut && i < lit;
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`flex h-16 w-11 flex-col items-center justify-center gap-2 border border-[var(--line)] bg-[var(--bg-elevated)] sm:h-20 sm:w-14 ${
                  on ? "start-light-on" : ""
                }`}
              >
                <span
                  className={`h-3.5 w-3.5 rounded-full sm:h-4 sm:w-4 ${
                    on
                      ? "bg-[var(--brand)] shadow-[0_0_18px_var(--brand)]"
                      : "bg-[var(--line-strong)] opacity-50"
                  }`}
                />
                <span
                  className={`h-3.5 w-3.5 rounded-full sm:h-4 sm:w-4 ${
                    on
                      ? "bg-[var(--brand)] shadow-[0_0_18px_var(--brand)]"
                      : "bg-[var(--line-strong)] opacity-50"
                  }`}
                />
              </div>
              <span className="font-mono text-[9px] tracking-[0.14em] text-[var(--muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>

      <p
        className={`mt-10 font-mono text-[11px] uppercase tracking-[0.2em] transition-opacity duration-300 ${
          lightsOut ? "text-[var(--live)] opacity-100" : "text-[var(--muted)] opacity-70"
        }`}
      >
        {lightsOut ? "Lights out · LapLedger" : "Waiting for lights…"}
      </p>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Tap or Esc to skip
      </p>
    </div>
  );
}
