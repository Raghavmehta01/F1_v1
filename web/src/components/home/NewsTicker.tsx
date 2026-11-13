"use client";

import { useEffect, useState } from "react";
import type { F1Headline } from "@/lib/data/f1-news";

type Props = {
  items: F1Headline[];
  className?: string;
};

/**
 * Full-width scrolling headline rail (LapLedger brand — not a third-party clone).
 */
export function NewsTicker({ items, className = "" }: Props) {
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!items.length) return null;

  const sep = (
    <span className="mx-4 inline-flex items-center gap-2 text-[var(--brand)]" aria-hidden>
      <span className="h-px w-3 bg-[var(--brand)]/70" />
      <span className="h-1 w-1 rotate-45 bg-[var(--brand)]" />
      <span className="h-px w-3 bg-[var(--brand)]/70" />
    </span>
  );

  const rail = items.map((item, i) => (
    <span key={`${item.href}-${i}`} className="inline-flex items-center">
      {i > 0 ? sep : null}
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink)] transition-colors hover:text-[var(--brand)] sm:text-[11px]"
      >
        {item.title}
      </a>
    </span>
  ));

  return (
    <div
      className={`news-ticker relative border-b border-[var(--line)] bg-[var(--bg)] ${className}`}
      role="region"
      aria-label="Latest F1 headlines"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--brand)]/55"
        aria-hidden
      />
      <div className="flex items-stretch">
        <div className="relative z-[1] flex shrink-0 items-center border-r border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--brand)]">
            Latest
          </span>
        </div>
        <div className="news-ticker-mask min-w-0 flex-1 overflow-hidden py-2.5">
          {motionOk ? (
            <div className="news-ticker-track flex w-max items-center">
              <div className="flex items-center px-4">{rail}</div>
              <div className="flex items-center px-4" aria-hidden>
                {rail}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-0 overflow-x-auto px-4">{rail}</div>
          )}
        </div>
        <a
          href="https://www.formula1.com/en/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-[1] hidden shrink-0 items-center border-l border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)] transition-colors hover:text-[var(--brand)] sm:flex"
        >
          F1.com
        </a>
      </div>
    </div>
  );
}
