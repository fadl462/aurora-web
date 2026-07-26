"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/lib/types";
import { ApiError, createConversation, listMessages, sendMessage } from "@/lib/api";
import { Composer } from "./Composer";
import { MessageBubble, TypingIndicator } from "./MessageBubble";

type ConnectionState = "connecting" | "ready" | "error";

export function ChatThread() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  // Real bootstrap: create an actual conversation via POST /v1/conversations
  // against the backend in aurora-api, per docs/06-api-specification.md.
  // No more seeded fake history — a fresh conversation starts empty, same
  // as it would for a real user. A 401 here means there's no valid
  // session — send them to /login rather than showing a confusing
  // "backend unreachable" message when the backend is actually fine.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const id = await createConversation();
        if (cancelled) return;
        setConversationId(id);
        const existing = await listMessages(id);
        if (cancelled) return;
        setMessages(existing);
        setConnection("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't connect to the Aurora API.");
        setConnection("error");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSend(text: string, attachmentNames: string[]) {
    const trimmed = text.trim();
    if (!trimmed && attachmentNames.length === 0) return;
    if (!conversationId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId,
      role: "user",
      content: trimmed,
      citations: attachmentNames.map((name) => ({ label: "📎", source: name })),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    scrollToBottom();
    setIsTyping(true);
    setErrorMessage(null);

    try {
      const assistantMessage = await sendMessage(conversationId, trimmed);
      setIsTyping(false);
      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    } catch (err) {
      setIsTyping(false);
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "Something went wrong sending that message. The backend may be unreachable.",
      );
      scrollToBottom();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-2 pt-7">
        <div className="mx-auto max-w-[760px] px-7">
          {connection === "connecting" && (
            <div className="mb-[26px] text-[13px] text-text-faint">Connecting to Aurora…</div>
          )}

          {connection === "error" && (
            <div className="mb-[26px] rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
              <strong className="font-semibold">Can&apos;t reach the backend.</strong> {errorMessage}
              <div className="mt-1 text-text-faint">
                Start it with <code className="font-mono">uvicorn app.main:app --reload</code> in{" "}
                <code className="font-mono">aurora-api</code>, then reload this page.
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {errorMessage && connection === "ready" && (
            <div className="mb-[26px] rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
              {errorMessage}
            </div>
          )}

          {isTyping && <TypingIndicator />}
        </div>
      </div>
      <Composer onSend={handleSend} disabled={connection !== "ready"} />
    </div>
  );
}
