"use client";

import { useEffect, useRef, useState } from "react";

const TRACKS = [
  {
    src: "/audio/playlist/verstappen-champions.mp3",
    label: "VER",
    title: "Max Verstappen — Champions Mix",
  },
  {
    src: "/audio/playlist/sainz-smooth-operator.mp3",
    label: "SAI",
    title: "Carlos Sainz — Smooth Operator",
  },
  {
    src: "/audio/playlist/friday-dopamine.mp3",
    label: "FRI",
    title: "Friday — Dopamine Re-Edit",
  },
  {
    src: "/audio/playlist/fernando-alonso.mp3",
    label: "ALO",
    title: "Fernando Alonso",
  },
] as const;

/**
 * Header playlist control — cycles the four home soundtrack tracks.
 * Lives next to day/night; independent of the radio sting.
 */
export function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const indexRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const audio = new Audio(TRACKS[0].src);
    audio.preload = "metadata";
    audio.volume = 0.55;
    audio.setAttribute("playsinline", "true");
    audioRef.current = audio;

    const onEnded = () => {
      const next = (indexRef.current + 1) % TRACKS.length;
      indexRef.current = next;
      setIndex(next);
      audio.src = TRACKS[next].src;
      void audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (!audio.src.endsWith(TRACKS[indexRef.current].src)) {
      audio.src = TRACKS[indexRef.current].src;
    }
    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  }

  async function nextTrack(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const next = (indexRef.current + 1) % TRACKS.length;
    indexRef.current = next;
    setIndex(next);
    audio.src = TRACKS[next].src;
    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  }

  const track = TRACKS[index];

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void toggle()}
        className="border border-[var(--line)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
        aria-pressed={playing}
        aria-label={playing ? `Pause ${track.title}` : `Play soundtrack`}
        title={track.title}
      >
        {playing ? `Pause · ${track.label}` : "Music"}
      </button>
      {playing ? (
        <button
          type="button"
          onClick={(e) => void nextTrack(e)}
          className="border border-[var(--line)] px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
          aria-label="Next track"
          title="Next track"
        >
          Next
        </button>
      ) : null}
    </div>
  );
}
