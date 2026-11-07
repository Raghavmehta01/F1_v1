import { ChatPanel } from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <div className="chat-page page-wrap flex flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-2 sm:mb-4">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)] sm:text-[10px]">
            Radio · Pit Wall
          </p>
          <h1 className="mt-0.5 font-display text-2xl tracking-tight text-[var(--ink)] sm:text-3xl md:text-4xl">
            Chat
          </h1>
        </div>
        <p className="hidden max-w-[14rem] text-right text-[11px] text-[var(--muted)] sm:block sm:text-xs">
          Official FIA regs + live standings
        </p>
      </div>

      <ChatPanel className="min-h-0 flex-1" />

      <p className="mt-2 shrink-0 truncate text-[10px] text-[var(--muted)] sm:mt-3 sm:text-[11px]">
        Regs © FIA ·{" "}
        <a
          href="https://www.fia.com/regulation/category/2182"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--ink)]"
        >
          fia.com
        </a>
        {" · "}
        Not affiliated with F1 / FIA
      </p>
    </div>
  );
}
