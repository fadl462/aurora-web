"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/lib/types";
import { ApiError, createConversation, sendMessage } from "@/lib/api";
import { createDocument, listDocuments, updateDocument, type Doc } from "@/lib/api";
import {
  createGeneratedDocument,
  downloadGeneratedDocument,
  listGeneratedDocuments,
  type GeneratedDoc,
  type GeneratedDocFormat,
} from "@/lib/api";
import { Composer } from "@/components/chat/Composer";
import { MessageBubble, TypingIndicator } from "@/components/chat/MessageBubble";

type Tab = "chat" | "doc" | "generate";
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

  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [genPrompt, setGenPrompt] = useState("");
  const [genFormat, setGenFormat] = useState<GeneratedDocFormat>("pptx");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

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

        // Best-effort — a failure here shouldn't block the rest of Canvas,
        // it just means the "previously generated" list starts empty.
        try {
          const generated = await listGeneratedDocuments();
          if (!cancelled) setGeneratedDocs(generated);
        } catch {
          // ignore — Generate tab will just show an empty list
        }
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

  async function handleGenerate() {
    const trimmed = genPrompt.trim();
    if (!trimmed || isGenerating) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const created = await createGeneratedDocument(trimmed, genFormat);
      setGeneratedDocs((prev) => [created, ...prev]);
      setGenPrompt("");
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : "Couldn't generate that document.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload(gd: GeneratedDoc) {
    try {
      await downloadGeneratedDocument(gd.id, `${gd.title}.${gd.format}`);
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : "Couldn't download that file.");
    }
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
        <TabButton active={tab === "generate"} onClick={() => setTab("generate")}>
          Generate
        </TabButton>
      </div>

      {tab !== "generate" ? (
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
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-[18px]">
          <div className="mx-auto w-full max-w-[560px]">
            <div className="mb-1 font-display text-[15px] font-semibold text-text">Generate a document</div>
            <div className="mb-4 text-[12.5px] text-text-faint">
              Describe what you want — Aurora writes real content and hands back an actual, downloadable file.
            </div>

            <div className="mb-3 flex gap-1.5">
              {(
                [
                  { id: "pptx", label: "PowerPoint" },
                  { id: "docx", label: "Word" },
                  { id: "xlsx", label: "Excel" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setGenFormat(f.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${
                    genFormat === f.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface-raised text-text-muted hover:bg-surface-hover"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <textarea
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              placeholder="e.g. A 5-slide deck pitching our Q3 roadmap to a client"
              rows={3}
              className="mb-3 w-full resize-none rounded-md border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text outline-none placeholder:text-text-faint"
            />

            {genError && (
              <div className="mb-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
                {genError}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !genPrompt.trim()}
              className="mb-6 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-[#0B0D12] transition-colors hover:bg-[#6C99FF] disabled:cursor-default disabled:opacity-40"
            >
              {isGenerating ? "Generating…" : "Generate"}
            </button>

            <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-text-faint">
              Previously generated
            </div>
            {generatedDocs.length === 0 && (
              <div className="text-[12.5px] text-text-faint">Nothing generated yet.</div>
            )}
            <div className="flex flex-col gap-2">
              {generatedDocs.map((gd) => (
                <div
                  key={gd.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-text">
                      {gd.title}
                      {gd.isPlaceholder && (
                        <span className="ml-2 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                          placeholder
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11.5px] text-text-faint">
                      {gd.format.toUpperCase()} · {Math.max(1, Math.round(gd.sizeBytes / 1024))} KB
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(gd)}
                    className="flex-shrink-0 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
