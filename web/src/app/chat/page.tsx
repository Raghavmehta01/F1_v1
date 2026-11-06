import { ChatPanel } from "@/components/ChatPanel";
import { PageHeader } from "@/components/PageHeader";

export default function ChatPage() {
  return (
    <div className="page-wrap space-y-8 py-14 sm:py-16">
      <PageHeader
        eyebrow="Agent · Groq + Chroma"
        title="Chat"
        description="Answers cite official FIA 2026 regulation PDFs in Chroma (Sections A–F + ISC) plus live Jolpica standings and results."
      />
      <ChatPanel />
      <p className="max-w-2xl text-xs text-[var(--muted)]">
        Regulation text © FIA — ingested from{" "}
        <a
          href="https://www.fia.com/regulation/category/2182"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--ink)]"
        >
          fia.com
        </a>
        . Not affiliated with Formula One or the FIA. Definitive text is always the
        current published English PDF.
      </p>
    </div>
  );
}
