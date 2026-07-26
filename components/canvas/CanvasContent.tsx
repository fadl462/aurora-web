"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/lib/types";
import { ApiError, createConversation, sendMessage } from "@/lib/api";
import { createDocument, listDocuments, updateDocument, type Doc } from "@/lib/api";
import { Composer } from "@/components/chat/Composer";
import { MessageBubble, TypingIndicator } from "@/components/chat/MessageBubble";

type Tab = "chat" | "doc";
type Stage = "loading" | "ready" | "error";

export function CanvasContent() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("chat");
  const [stage, setStage] = useState<Stage>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [doc, setDoc] = useState<Doc | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [convId, docs] = await Promise.all([
          createConversation("Canvas session"),
          listDocuments(),
        ]);
        if (cancelled) return;
        setConversationId(convId);

        const existingDoc = docs[0] ?? (await createDocument("Untitled document", ""));
        if (cancelled) return;
        setDoc(existingDoc);
        setStage("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't load Canvas.");
        setStage("error");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function handleSend(text: string, attachmentNames: string[]) {
    const trimmed = text.trim();
    if (!trimmed && attachmentNames.length === 0) return;
    if (!conversationId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    scrollToBottom();
    setIsTyping(true);

    try {
      const reply = await sendMessage(conversationId, trimmed);
      setIsTyping(false);
      setMessages((prev) => [...prev, reply]);
      scrollToBottom();
    } catch {
      setIsTyping(false);
    }
  }

  function handleDocChange(content: string) {
    if (!doc) return;
    setDoc({ ...doc, content });
    setSaveState("idle");

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await updateDocument(doc.id, { content });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 800);
  }

  if (stage === "loading") {
    return <div className="p-8 text-[13px] text-text-faint">Loading Canvas…</div>;
  }

  if (stage === "error") {
    return (
      <div className="p-8">
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-border-soft px-5 py-2.5">
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")} live>
          Chat
        </TabButton>
        <TabButton active={tab === "doc"} onClick={() => setTab("doc")}>
          {doc?.title || "Document"}
        </TabButton>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <div className={`flex min-h-0 flex-col border-b border-border-soft md:border-b-0 md:border-r ${tab !== "chat" ? "hidden md:flex" : ""}`}>
          <PanelHeader label="Chat" />
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-[18px]">
            {messages.length === 0 && (
              <div className="text-[12.5px] text-text-faint">
                Ask Aurora to help with the document on the right — this is a real conversation, same backend as
                the Chat page.
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} compact />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
          <Composer onSend={handleSend} />
        </div>

        <div className={`flex min-h-0 flex-col ${tab !== "doc" ? "hidden md:flex" : ""}`}>
          <PanelHeader label="Document">
            <span className="text-[11px] text-text-faint">
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
            </span>
          </PanelHeader>
          <div className="flex-1 overflow-y-auto px-5 py-[18px]">
            <input
              value={doc?.title ?? ""}
              onChange={(e) => {
                if (!doc) return;
                setDoc({ ...doc, title: e.target.value });
              }}
              onBlur={() => {
                if (doc) updateDocument(doc.id, { title: doc.title });
              }}
              className="mb-3 w-full bg-transparent font-display text-[16px] font-semibold text-text outline-none"
              placeholder="Untitled document"
            />
            <textarea
              value={doc?.content ?? ""}
              onChange={(e) => handleDocChange(e.target.value)}
              placeholder="Start writing — this saves automatically."
              className="h-full min-h-[300px] w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-text-muted outline-none placeholder:text-text-faint"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  live,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  live?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12.5px] font-medium ${
        active ? "bg-surface-raised text-text" : "text-text-muted hover:bg-surface-raised"
      }`}
    >
      {live && <span className="h-1.5 w-1.5 rounded-full bg-aurora-1" />}
      {children}
    </button>
  );
}

function PanelHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-border-soft px-4 py-2.5">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-text-faint">{label}</div>
      {children}
    </div>
  );
}
