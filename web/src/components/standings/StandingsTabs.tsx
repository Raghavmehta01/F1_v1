"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { id: "drivers", label: "Drivers" },
  { id: "constructors", label: "Constructors" },
] as const;

function activeTab(raw: string | null): "drivers" | "constructors" {
  return raw === "constructors" ? "constructors" : "drivers";
}

/** On-page Drivers / Constructors toggle (default: Drivers). */
export function StandingsTabs({ season }: { season?: string }) {
  const params = useSearchParams();
  const active = activeTab(params.get("tab"));

  return (
    <div
      className="inline-flex rounded-sm border border-[var(--line-strong)] bg-[var(--bg-elevated)] p-1"
      role="tablist"
      aria-label="Standings type"
    >
      {TABS.map((tab) => {
        const q = new URLSearchParams();
        if (season) q.set("season", season);
        if (tab.id !== "drivers") q.set("tab", tab.id);
        const href = q.toString() ? `/standings?${q.toString()}` : "/standings";
        const isOn = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            role="tab"
            aria-selected={isOn}
            className={`min-w-[9.5rem] px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
              isOn
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
