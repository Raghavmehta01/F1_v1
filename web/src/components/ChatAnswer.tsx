type Source = {
  title?: string | null;
  section?: string | null;
  issue?: string | null;
  page?: number | string | null;
  url?: string | null;
};

/** Strip model markdown noise for a clean pit-wall read. */
export function cleanAnswerText(raw: string): string {
  let t = raw.replace(/\r\n/g, "\n").trim();
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/__([^_]+)__/g, "$1");
  t = t.replace(/\*([^*\n]+)\*/g, "$1");
  t = t.replace(/^[\t ]*[-*•]\s+/gm, "• ");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/^Citation:\s*/gim, "");
  return t.trim();
}

function sourceLabel(s: Source): string {
  const parts: string[] = [];
  if (s.section) parts.push(`Sec ${s.section}`);
  if (s.issue) parts.push(`Iss ${s.issue}`);
  if (s.page != null && s.page !== "") parts.push(`p.${s.page}`);
  if (parts.length) return parts.join(" · ");
  return s.title?.replace(/^FIA 2026 F1 Regulations —\s*/i, "") || "FIA document";
}

function compactSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of sources) {
    const key = `${s.section ?? ""}|${s.issue ?? ""}|${s.page ?? ""}|${s.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 3) break;
  }
  return out;
}

export function ChatAnswer({
  content,
  sources,
}: {
  content: string;
  sources?: Source[];
}) {
  const text = cleanAnswerText(content);
  const paras = text.split(/\n{2,}/).filter(Boolean);
  const cites = compactSources(sources ?? []);

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 text-sm leading-relaxed text-[var(--ink)]">
        {paras.map((block, i) => {
          const lines = block.split("\n").filter(Boolean);
          const isList = lines.every((l) => l.trimStart().startsWith("• "));
          if (isList) {
            return (
              <ul key={i} className="space-y-1.5 pl-1">
                {lines.map((l, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" />
                    <span>{l.replace(/^\s*•\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p
              key={i}
              className={
                i === 0
                  ? "font-medium tracking-tight text-[var(--ink)]"
                  : "text-[var(--ink)]/90"
              }
            >
              {block}
            </p>
          );
        })}
      </div>

      {cites.length > 0 ? (
        <div className="border-t border-[var(--line)] pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Sources
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {cites.map((s, j) => {
              const label = sourceLabel(s);
              const className =
                "font-mono text-[10px] tracking-wide text-[var(--muted)] underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--ink)]";
              return (
                <li key={`${label}-${j}`}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className={className}>
                      {label}
                    </a>
                  ) : (
                    <span className={className}>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
