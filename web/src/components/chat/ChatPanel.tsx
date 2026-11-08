"use client";

import { ChatAnswer } from "@/components/chat/ChatAnswer";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

type Role = "user" | "assistant";

type Source = {
  title?: string | null;
  section?: string | null;
  issue?: string | null;
  page?: number | string | null;
  url?: string | null;
};

type Msg = {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  cached?: boolean;
  at: number;
};

type KnowledgeStatus = {
  collection_count?: number;
  ready?: boolean;
  groq_configured?: boolean;
  error?: string;
};

type QuotaStatus = {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
};

const OWNER_TOKEN_KEY = "f1_chat_owner_token";

const SUGGESTIONS = [
  "What is a red flag?",
  "What does parc fermé restrict?",
  "Current driver standings top 5",
  "Sprint qualifying format?",
];

function ownerHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem(OWNER_TOKEN_KEY)?.trim();
  return token ? { "X-Chat-Owner-Token": token } : {};
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function TypingDots() {
  return (
    <div className="flex items-end gap-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--brand)] font-mono text-[10px] font-bold text-white"
        aria-hidden
      >
        PW
      </span>
      <div className="rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3">
        <span className="chat-typing flex items-center gap-1" aria-label="Typing">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

export function ChatPanel({ className = "" }: { className?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeStatus | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/quota", {
        cache: "no-store",
        headers: ownerHeaders(),
      });
      const data = (await res.json()) as { quota?: QuotaStatus };
      if (data.quota) setQuota(data.quota);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const owner = params.get("owner")?.trim();
    if (owner) {
      window.localStorage.setItem(OWNER_TOKEN_KEY, owner);
      void fetch("/api/chat/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: owner }),
      })
        .then(async (res) => {
          if (res.ok) {
            setQuota({ unlimited: true, limit: 5, used: 0, remaining: 5 });
            const url = new URL(window.location.href);
            url.searchParams.delete("owner");
            window.history.replaceState({}, "", url.pathname + url.search);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    void refreshKnowledge();
    void refreshQuota();
    const onFocus = () => {
      void refreshKnowledge();
      void refreshQuota();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshKnowledge, refreshQuota]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const quotaBlocked = Boolean(quota && !quota.unlimited && quota.remaining <= 0);

  function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || pending || quotaBlocked) return;
    setInput("");
    setError(null);
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content: text,
      at: Date.now(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...ownerHeaders(),
          },
          body: JSON.stringify({
            message: text,
            history: nextHistory.slice(0, -1).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const data = await res.json();
        if (data.quota) setQuota(data.quota as QuotaStatus);
        if (!res.ok) {
          setError(data.error || data.detail || "Chat failed");
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "assistant",
              content:
                typeof data.detail === "string"
                  ? data.detail
                  : data.error || "Request failed.",
              at: Date.now(),
            },
          ]);
          await refreshKnowledge();
          return;
        }
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: data.answer || "No answer.",
            sources: data.sources || [],
            cached: Boolean(data.cached),
            at: Date.now(),
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

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  const count = knowledge?.collection_count ?? 0;
  const ready = Boolean(knowledge?.ready) || count > 0;
  const empty = messages.length === 0 && !pending;

  return (
    <div
      className={`chat-shell flex min-h-0 w-full flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg)] shadow-[0_20px_50px_rgba(0,0,0,0.18)] ${className}`}
    >
      {/* Channel header */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--brand)] font-display text-xs tracking-tight text-white sm:h-10 sm:w-10 sm:text-sm">
            PW
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-elevated)] ${
                ready ? "bg-[var(--gain)]" : "bg-[var(--live)]"
              }`}
              title={ready ? "Online" : "Offline"}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm tracking-tight text-[var(--ink)] sm:text-base">
              Pitwall
            </p>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] sm:text-[10px]">
              {ready ? "Online" : "Offline"}
              {knowledge?.groq_configured === false ? " · unavailable" : ""}
            </p>
          </div>
        </div>
        {quota ? (
          <p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] sm:text-[10px]">
            {quota.unlimited
              ? "Unlimited"
              : `${quota.remaining}/${quota.limit} left`}
          </p>
        ) : null}
      </header>

      {/* Thread */}
      <div
        ref={listRef}
        className="chat-thread relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 sm:px-5 sm:py-4"
      >
        {empty ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-2 text-center">
            <p className="font-display text-xl tracking-tight text-[var(--ink)] sm:text-2xl">
              Ask the wall
            </p>
            <p className="mt-2 max-w-sm text-xs text-[var(--muted)] sm:text-sm">
              Rules from official FIA PDFs, or live standings and results.
            </p>
            {quotaBlocked ? (
              <p className="mt-5 max-w-sm text-xs text-[var(--brand)] sm:mt-6">
                Prompt limit reached ({quota?.limit ?? 5} per visitor).
              </p>
            ) : (
              <div className="mt-5 grid w-full max-w-lg grid-cols-1 gap-2 sm:mt-6 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left text-xs text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] sm:py-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 sm:gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[9px] font-bold sm:h-8 sm:w-8 sm:text-[10px] ${
                      isUser
                        ? "bg-[var(--ink)] text-[var(--bg)]"
                        : "bg-[var(--brand)] text-white"
                    }`}
                    aria-hidden
                  >
                    {isUser ? "YOU" : "PW"}
                  </span>
                  <div
                    className={`flex min-w-0 max-w-[min(100%,calc(100%-2.5rem))] flex-col gap-1 sm:max-w-[min(85%,36rem)] ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={
                        isUser
                          ? "rounded-2xl rounded-br-md bg-[var(--brand)] px-3.5 py-2.5 text-sm leading-relaxed text-white"
                          : "rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink)]"
                      }
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <ChatAnswer
                          content={m.content}
                          sources={m.sources}
                          tone="bubble"
                        />
                      )}
                    </div>
                    <p
                      className={`px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] ${
                        isUser ? "text-right" : "text-left"
                      }`}
                    >
                      {isUser ? "You" : "Pitwall"}
                      {m.cached ? " · cached" : ""}
                      {" · "}
                      {new Date(m.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            {pending ? <TypingDots /> : null}
            <div ref={bottomRef} className="h-px" />
          </div>
        )}
      </div>

      {error ? (
        <p className="shrink-0 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2 font-mono text-[11px] text-[var(--brand)]">
          {error}
        </p>
      ) : null}

      {/* Composer */}
      <form
        className="shrink-0 border-t border-[var(--line)] bg-[var(--bg-elevated)] p-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-1.5 focus-within:border-[var(--ink)] sm:p-2">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            maxLength={2000}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow(e.target);
            }}
            onKeyDown={onKeyDown}
            disabled={pending || quotaBlocked}
            placeholder={
              quotaBlocked ? "Prompt limit reached" : "Message Pitwall…"
            }
            className="max-h-[120px] min-h-[40px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-snug text-[var(--ink)] outline-none placeholder:text-[var(--muted)] disabled:opacity-60 sm:max-h-[140px] sm:py-2.5"
          />
          <button
            type="submit"
            disabled={pending || quotaBlocked || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--brand)] text-white transition hover:bg-[var(--brand-deep)] disabled:opacity-40 sm:h-10 sm:w-10"
            aria-label="Send"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
          </button>
        </div>
        <p className="mx-auto mt-1.5 hidden max-w-3xl px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] sm:mt-2 sm:block">
          Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
