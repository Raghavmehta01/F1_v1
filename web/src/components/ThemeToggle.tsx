"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="border border-[var(--line)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? "Day" : "Night"}
    </button>
  );
}
