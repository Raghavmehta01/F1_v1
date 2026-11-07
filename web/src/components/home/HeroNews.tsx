"use client";

import { useEffect, useRef, useState } from "react";
import type { F1Headline } from "@/lib/data/f1-news";

const VISIBLE = 5;
const INTERVAL_MS = 3400;
const ROW_PX = 64; // matches h-16 rows

/** Slim official F1 headlines — more items, one-by-one upward slide. */
export function HeroNews({ items }: { items: F1Headline[] }) {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const paused = useRef(false);

  const feed = items.length ? items : [];
  const loop = feed.length ? [...feed, ...feed.slice(0, VISIBLE)] : [];

  useEffect(() => {
    if (feed.length <= VISIBLE) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAnimating(false);
      return;
    }

    const id = window.setInterval(() => {
      if (paused.current) return;
      setIndex((i) => i + 1);
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [feed.length]);

  useEffect(() => {
    if (feed.length <= VISIBLE) return;
    if (index < feed.length) return;
    // Seamless reset after finishing one full pass through the duplicated head.
    const t = window.setTimeout(() => {
      setAnimating(false);
      setIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    }, 520);
    return () => window.clearTimeout(t);
  }, [index, feed.length]);

  if (!feed.length) return null;

  const sliding = feed.length > VISIBLE;

  return (
    <aside className="animate-hero-rise-delay hidden min-h-0 w-[min(20rem,26%)] shrink-0 flex-col justify-center border-l border-[var(--line)] px-5 py-10 xl:w-[min(22rem,24%)] xl:px-6 lg:flex">
      <div className="mb-5 flex items-end justify-between gap-3">
        <p className="eyebrow">Latest</p>
        <a
          href="https://www.formula1.com/en/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--brand)]"
        >
          F1.com →
        </a>
      </div>

      <div
        className="relative overflow-hidden border-y border-[var(--line)]"
        style={{ height: VISIBLE * ROW_PX }}
        onMouseEnter={() => {
          paused.current = true;
        }}
        onMouseLeave={() => {
          paused.current = false;
        }}
      >
        <ul
          className={animating && sliding ? "transition-transform duration-500 ease-out" : ""}
          style={{
            transform: sliding
              ? `translate3d(0, -${index * ROW_PX}px, 0)`
              : undefined,
          }}
        >
          {(sliding ? loop : feed.slice(0, VISIBLE)).map((item, i) => (
            <li key={`${item.href}-${i}`} className="h-16 border-b border-[var(--line)] last:border-b-0">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full items-start gap-3 py-3 transition-colors"
              >
                <span
                  className="mt-2 h-1 w-1 shrink-0 bg-[var(--brand)]"
                  aria-hidden
                />
                <span className="line-clamp-2 text-sm leading-snug text-[var(--ink)] group-hover:text-[var(--brand)]">
                  {item.title}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
