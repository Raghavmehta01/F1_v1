"use client";

import { useState } from "react";

export function ShareCardButton({
  title,
  text,
  className = "",
}: {
  title: string;
  text: string;
  className?: string;
}) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const payload = { title, text, url };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setNote("Shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setNote("Copied");
      } else {
        setNote("Copy unavailable");
      }
    } catch {
      setNote(null);
    }
    window.setTimeout(() => setNote(null), 1600);
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={`border border-[var(--line)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)] ${className}`}
    >
      {note ?? "Share"}
    </button>
  );
}
