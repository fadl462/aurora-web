"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, createConversation, sendMessage } from "@/lib/api";
import type { Message } from "@/lib/types";

type Stage = "idle" | "connecting" | "ready" | "running" | "error";

export function ResearchContent() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Message | null>(null);
  const [stage, setStage] = useState<Stage>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const id = await createConversation("Research session");
        if (cancelled) return;
        setConversationId(id);
        setStage("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't connect to the Aurora API.");
        setStage("error");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || !conversationId || stage === "running") return;

    setStage("running");
    setErrorMessage(null);
    try {
      const reply = await sendMessage(conversationId, trimmed, "research");
      setResult(reply);
      setStage("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : "The research request failed.");
      setStage("error");
    }
  }

  return (
    <div className="mx-auto max-w-[820px] overflow-y-auto px-8 pb-16 pt-8">
      <h1 className="mb-1.5 font-display text-[24px] font-semibold tracking-tight">Research</h1>
      <p className="mb-6 text-[13.5px] text-text-muted">
        Ask an open-ended question. This uses the same model connection as Chat, in research mode.
      </p>

      <form onSubmit={handleSubmit} className="mb-8 flex gap-2.5">
        <textarea
          ref={inputRef}
          rows={2}
          value={query}
          disabled={stage === "connecting"}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={stage === "connecting" ? "Connecting…" : "e.g. What should I consider when choosing a vector database?"}
          className="flex-1 resize-none rounded-lg border border-border bg-surface px-4 py-3 text-[14px] text-text placeholder:text-text-faint focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!query.trim() || !conversationId || stage === "running"}
          className="self-start rounded-lg bg-accent px-4 py-3 text-[13px] font-semibold text-bg transition-colors hover:bg-[#6C99FF] disabled:cursor-default disabled:opacity-40"
        >
          {stage === "running" ? "Thinking…" : "Ask"}
        </button>
      </form>

      {stage === "error" && (
        <div className="mb-6 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
          {errorMessage}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-border-soft bg-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-text-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-aurora-1 via-aurora-2 to-aurora-3" />
            {result.citations && result.citations.length > 0 ? "with sources" : "model-generated, no live sources"}
          </div>
          <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-text">{result.content}</p>

          {result.citations && result.citations.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {result.citations.map((c, i) => (
                <span key={i} className="rounded-md border border-border bg-surface-raised px-2.5 py-1 font-mono text-[11.5px] text-text-muted">
                  {c.label} {c.source}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-border-soft bg-surface-raised px-3.5 py-2.5 text-[12px] leading-relaxed text-text-faint">
              This answer has no live web sources attached — Aurora doesn&apos;t have a search tool connected in this
              deployment yet, so it never fabricates citations. Treat this as a starting point, not a verified report.
            </div>
          )}
        </div>
      )}

      {!result && stage === "ready" && (
        <div className="flex flex-col items-center py-16 text-center text-text-faint">
          <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-md bg-surface-raised text-text-muted">
            <SearchIcon />
          </div>
          <div className="mb-1 text-[13.5px] font-semibold text-text">Ask something to get started</div>
          <div className="max-w-[280px] text-[12.5px] leading-relaxed">
            Your question goes straight to the connected model — no canned demo content here.
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
