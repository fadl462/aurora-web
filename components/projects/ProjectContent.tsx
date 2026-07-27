"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Conversation, Project } from "@/lib/types";
import { ApiError, createConversation, getProject, listConversationsForProject, listDocuments, type Doc } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

type LoadState = "loading" | "ready" | "error";

export function ProjectContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [proj, convos, docs] = await Promise.all([
          getProject(projectId),
          listConversationsForProject(projectId),
          listDocuments(projectId),
        ]);
        if (cancelled) return;
        setProject(proj);
        setConversations(convos);
        setDocuments(docs);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMessage(
          err instanceof ApiError && err.status === 404
            ? "This project doesn't exist, or isn't yours."
            : err instanceof ApiError
              ? err.message
              : "Couldn't load this project.",
        );
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  async function handleNewChat() {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const id = await createConversation(undefined, projectId);
      router.push(`/chat/${id}`);
    } catch {
      setCreatingChat(false);
    }
  }

  if (state === "loading") {
    return <div className="p-8 text-[13px] text-text-faint">Loading project…</div>;
  }

  if (state === "error") {
    return (
      <div className="p-8">
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[920px] overflow-y-auto px-8 pb-16 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`h-3 w-3 rounded-full ${project?.color}`} />
          <h1 className="font-display text-[22px] font-semibold tracking-tight">{project?.name}</h1>
        </div>
        <button
          onClick={handleNewChat}
          disabled={creatingChat}
          className="rounded-md bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-bg transition-colors hover:bg-[#6C99FF] disabled:cursor-default disabled:opacity-60"
        >
          {creatingChat ? "Starting…" : "New chat in this project"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-border-soft bg-surface p-[18px]">
          <div className="mb-3 font-display text-[14.5px] font-semibold">Conversations</div>
          {conversations.length === 0 && (
            <div className="py-6 text-center text-[12.5px] text-text-faint">
              Nothing here yet — conversations you start in this project stay scoped to it, and never mix with your
              personal chats or other projects.
            </div>
          )}
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="flex items-center gap-3 border-b border-border-soft px-1.5 py-2.5 last:border-none hover:bg-surface-raised"
            >
              <div className="min-w-0 truncate text-[13px] font-medium">{c.title}</div>
              <div className="ml-auto flex-shrink-0 text-[11px] text-text-faint">
                {formatRelativeTime(c.updatedAt)}
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-lg border border-border-soft bg-surface p-[18px]">
          <div className="mb-3 font-display text-[14.5px] font-semibold">Documents</div>
          {documents.length === 0 && (
            <div className="py-6 text-center text-[12.5px] text-text-faint">
              No documents in this project yet — create one from Canvas and scope it here.
            </div>
          )}
          {documents.map((d) => (
            <div key={d.id} className="flex items-center gap-3 border-b border-border-soft px-1.5 py-2.5 last:border-none">
              <div className="min-w-0 truncate text-[13px] font-medium">{d.title}</div>
              <div className="ml-auto flex-shrink-0 text-[11px] text-text-faint">
                {formatRelativeTime(d.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
