"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/lib/types";
import { ApiError, createConversation, getConversation, listMessages, sendMessage } from "@/lib/api";
import { useModel } from "@/lib/model-context";
import { Composer } from "./Composer";
import { MessageBubble, TypingIndicator } from "./MessageBubble";

type ConnectionState = "connecting" | "ready" | "error";

export function ChatThread({
  existingConversationId,
  projectId,
}: {
  // When set, resumes this real conversation (its actual message
  // history) instead of always creating a brand new one. Without this,
  // every visit to /chat — including clicking a "recent thread" —
  // silently created a fresh, empty conversation and the old one was
  // never actually reopened, even though it stayed listed everywhere.
  existingConversationId?: string;
  // When starting a NEW conversation (no existingConversationId), scopes
  // it to this project — matching the real context-wall semantics the
  // backend already enforces for conversations.
  projectId?: string;
} = {}) {
  const router = useRouter();
  const { model } = useModel();
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

  // Real bootstrap against the backend in aurora-api, per
  // docs/06-api-specification.md. If existingConversationId is given,
  // this actually resumes it (real ownership check via getConversation,
  // then its real message history) rather than creating a new one. A
  // 401 here means there's no valid session — send them to /login
  // rather than showing a confusing "backend unreachable" message when
  // the backend is actually fine. A 404 on a bad/foreign conversation id
  // sends them back to a fresh chat rather than dead-ending.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        let id: string;
        if (existingConversationId) {
          await getConversation(existingConversationId); // real 404/ownership check
          id = existingConversationId;
        } else {
          id = await createConversation(undefined, projectId);
        }
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
        if (err instanceof ApiError && err.status === 404) {
          router.push("/chat");
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
  }, [router, existingConversationId, projectId]);

  async function handleSend(text: string, attachmentNames: string[], mode?: string) {
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
      const assistantMessage = await sendMessage(conversationId, trimmed, mode, model);
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
