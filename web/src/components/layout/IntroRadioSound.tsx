"use client";

import { useEffect, useRef } from "react";

const SRC = "/audio/formula-1-radio-notification.mp3";

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

async function tryPlay(): Promise<boolean> {
  if (playedThisPageLoad) return true;
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
 */
export function IntroRadioSound() {
  const armed = useRef(false);

  useEffect(() => {
    if (playedThisPageLoad || armed.current) return;
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

    // Always arm gesture unlock (capture) so a blocked autoplay still works.
    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    document.addEventListener("touchstart", onGesture, true);
    document.addEventListener("click", onGesture, true);

    const kick = () => {
      void tryPlay().then((ok) => {
        if (ok) detach();
      });
    };

    // Try as soon as the file can play, plus a couple of delayed retries.
    if (audio.readyState >= 2) kick();
    else audio.addEventListener("canplaythrough", kick, { once: true });

    const t1 = window.setTimeout(kick, 120);
    const t2 = window.setTimeout(kick, 600);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      // Do not pause/destroy sharedAudio — Strict Mode remount would kill playback.
      if (!playedThisPageLoad) detach();
    };
  }, []);

  return (
    <audio
      src={SRC}
      preload="auto"
      playsInline
      className="pointer-events-none fixed h-0 w-0 opacity-0"
      aria-hidden
    />
  );
}
