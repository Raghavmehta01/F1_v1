"use client";

import { CarLoader } from "@/components/CarLoader";
import { ChatAnswer } from "@/components/ChatAnswer";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

type Role = "user" | "assistant";

type Source = {
  title?: string | null;
  section?: string | null;
  issue?: string | null;
  page?: number | string | null;
  url?: string | null;
};

type Msg = {
  role: Role;
  content: string;
  sources?: Source[];
};

type KnowledgeStatus = {
  collection_count?: number;
  ready?: boolean;
  groq_configured?: boolean;
  error?: string;
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeStatus | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshKnowledge = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/knowledge", { cache: "no-store" });
      const data = (await res.json()) as KnowledgeStatus;
      const count = Number(data.collection_count ?? 0);
      setKnowledge({
        ...data,
        collection_count: count,
        ready: Boolean(data.ready) || count > 0,
      });
    } catch {
      setKnowledge((k) => k ?? { ready: false, collection_count: 0 });
    }
  }, []);

  useEffect(() => {
    void refreshKnowledge();
    const onFocus = () => void refreshKnowledge();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshKnowledge]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function ingestOfficial() {
    setIngesting(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/ingest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : data.error || "Ingest failed",
        );
        await refreshKnowledge();
        return;
      }
      setKnowledge({
        ready: Number(data.collection_count ?? 0) > 0,
        collection_count: Number(data.collection_count ?? 0),
        groq_configured: knowledge?.groq_configured,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingest failed");
      await refreshKnowledge();
    } finally {
      setIngesting(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    setError(null);
    const nextHistory = [...messages, { role: "user" as const, content: text }];
    setMessages(nextHistory);

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: nextHistory.slice(0, -1).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || data.detail || "Chat failed");
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content:
                typeof data.detail === "string"
                  ? data.detail
                  : data.error || "Request failed.",
            },
          ]);
          await refreshKnowledge();
          return;
        }
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.answer || "No answer.",
            sources: data.sources || [],
          },
        ]);
        if (typeof data.collection_count === "number") {
          setKnowledge((k) => ({
            ...(k || {}),
            collection_count: data.collection_count,
            ready: data.collection_count > 0,
          }));
        } else {
          await refreshKnowledge();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chat failed");
        await refreshKnowledge();
      }
    });
  }

  const count = knowledge?.collection_count ?? 0;
  const ready = Boolean(knowledge?.ready) || count > 0;

  return (
    <div className="flex min-h-[70vh] flex-col border border-[var(--line)] bg-[var(--bg-elevated)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Knowledge
          </p>
          <p className="mt-1 text-sm text-[var(--ink)]">
            {ready
              ? `${count} official FIA chunks indexed`
              : "Official FIA PDFs not ingested yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshKnowledge()}
            className="btn-ghost text-[10px] uppercase tracking-[0.14em]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={ingestOfficial}
            disabled={ingesting}
            className="btn-ghost text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"
          >
            {ingesting ? "Ingesting FIA PDFs…" : "Ingest official regs"}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
        {messages.length === 0 && !pending ? (
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p>
              Ask rules from official FIA 2026 Sections A–F / ISC, or live standings
              and results.
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-[var(--ink)]">
              <li>· What does parc fermé restrict before the race?</li>
              <li>· Sprint qualifying format under Section B?</li>
              <li>· Current driver championship top 5?</li>
            </ul>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={
              m.role === "user"
                ? "ml-auto max-w-[92%] border border-[var(--line)] bg-[var(--bg)] px-4 py-3 sm:max-w-[80%]"
                : "max-w-[92%] border-l-2 border-[var(--brand)] bg-[var(--bg)]/40 px-4 py-3 sm:max-w-[88%]"
            }
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {m.role === "user" ? "You" : "Pit Wall"}
            </p>
            <div className="mt-2">
              {m.role === "assistant" ? (
                <ChatAnswer content={m.content} sources={m.sources} />
              ) : (
                <p className="text-sm leading-relaxed text-[var(--ink)]">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {pending ? <CarLoader size="inline" label="Thinking" /> : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-[var(--line)] px-4 py-2 font-mono text-[11px] text-[var(--brand)] sm:px-5">
          {error}
        </p>
      ) : null}

      <form
        className="flex gap-2 border-t border-[var(--line)] p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a rule or standings question…"
          maxLength={4000}
          className="min-w-0 flex-1 border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--ink)]"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="btn-primary disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
