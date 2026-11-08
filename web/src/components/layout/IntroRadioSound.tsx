"use client";

import { useEffect, useRef, useState } from "react";

const SRC = "/audio/formula-1-radio-notification.mp3";
const MUTE_KEY = "f1_radio_muted";

/** Survives React Strict Mode remounts within the same page load. */
let playedThisPageLoad = false;
let sharedAudio: HTMLAudioElement | null = null;

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(SRC);
    sharedAudio.preload = "auto";
    sharedAudio.volume = 0.9;
    sharedAudio.setAttribute("playsinline", "true");
  }
  return sharedAudio;
}

function readMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

async function tryPlay(): Promise<boolean> {
  if (playedThisPageLoad || readMuted()) return true;
  const audio = getAudio();
  if (!audio) return false;
  try {
    audio.currentTime = 0;
    await audio.play();
    playedThisPageLoad = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Plays the pit-wall sting on load / hard refresh.
 * Browsers often block unmuted autoplay — falls back to first user gesture.
 * Mute persists in localStorage.
 */
export function IntroRadioSound() {
  const armed = useRef(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(readMuted());
  }, []);

  useEffect(() => {
    if (playedThisPageLoad || armed.current || readMuted()) return;
    armed.current = true;

    const audio = getAudio();
    if (!audio) return;

    const onGesture = () => {
      void tryPlay().then((ok) => {
        if (ok) detach();
      });
    };

    const detach = () => {
      document.removeEventListener("pointerdown", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
      document.removeEventListener("touchstart", onGesture, true);
      document.removeEventListener("click", onGesture, true);
    };

    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    document.addEventListener("touchstart", onGesture, true);
    document.addEventListener("click", onGesture, true);

    const kick = () => {
      void tryPlay().then((ok) => {
        if (ok) detach();
      });
    };

    if (audio.readyState >= 2) kick();
    else audio.addEventListener("canplaythrough", kick, { once: true });

    const t1 = window.setTimeout(kick, 120);
    const t2 = window.setTimeout(kick, 600);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (!playedThisPageLoad) detach();
    };
  }, []);

  function toggleMute() {
    const next = !readMuted();
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    setMuted(next);
    if (next) {
      sharedAudio?.pause();
    }
  }

  function replay() {
    if (readMuted()) return;
    playedThisPageLoad = false;
    void tryPlay();
  }

  return (
    <>
      <audio
        src={SRC}
        preload="auto"
        playsInline
        className="pointer-events-none fixed h-0 w-0 opacity-0"
        aria-hidden
      />
      <div className="fixed bottom-3 right-3 z-50 flex gap-1 sm:bottom-4 sm:right-4">
        <button
          type="button"
          onClick={replay}
          disabled={muted}
          className="border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-40"
          aria-label="Play radio sting"
        >
          Radio
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
          aria-pressed={muted}
          aria-label={muted ? "Unmute radio" : "Mute radio"}
        >
          {muted ? "Muted" : "Mute"}
        </button>
      </div>
    </>
  );
}
