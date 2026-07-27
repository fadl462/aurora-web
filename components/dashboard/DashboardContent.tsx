"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Conversation, Project } from "@/lib/types";
import { ApiError, getCurrentUser, listConversations, listProjects, type CurrentUser } from "@/lib/api";
import { displayName, formatRelativeTime, timeOfDayGreeting, todayLabel } from "@/lib/format";

const QUICK_ACTIONS = [
  { title: "Start a chat", sub: "Ask anything, attach files", href: "/chat", color: "bg-aurora-1/10 text-aurora-1" },
  { title: "New research", sub: "Multi-source, cited report", href: "/research", color: "bg-aurora-2/10 text-aurora-2" },
  { title: "Build automation", sub: "Trigger → tool → report", href: "/agents", color: "bg-aurora-3/10 text-aurora-3" },
  { title: "Upload files", sub: "Attach to a chat message", href: "/chat", color: "bg-aurora-4/10 text-aurora-4" },
] as const;

type LoadState = "loading" | "ready" | "error";

export function DashboardContent() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [conversationList, projectList, currentUser] = await Promise.all([
          listConversations(),
          listProjects(),
          getCurrentUser(),
        ]);
        if (cancelled) return;
        setConversations(conversationList);
        setProjects(projectList);
        setUser(currentUser);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't load your workspace.");
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-[920px] overflow-y-auto px-8 pb-16 pt-11">
      <div className="mb-1.5 font-mono text-[11.5px] text-text-faint">{todayLabel()}</div>
      <h1 className="mb-1.5 font-display text-[30px] font-semibold tracking-tight">
        {timeOfDayGreeting()}, {displayName(user)} <span className="aurora-gradient-text">✦</span>
      </h1>
      <p className="mb-[34px] text-[14.5px] text-text-muted">
        {state === "ready"
          ? conversations.length > 0
            ? `${conversations.length} conversation${conversations.length === 1 ? "" : "s"} so far`
            : "No conversations yet — start one below"
          : "Loading your workspace…"}
      </p>

      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.title}
            href={a.href}
            className="rounded-lg border border-border-soft bg-surface p-4 transition-transform hover:-translate-y-0.5 hover:border-border-hover"
          >
            <div className={`mb-3 flex h-[30px] w-[30px] items-center justify-center rounded-md ${a.color}`}>
              <DotIcon />
            </div>
            <div className="mb-0.5 text-[13.5px] font-semibold">{a.title}</div>
            <div className="text-[12px] text-text-faint">{a.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-border-soft bg-surface p-[18px]">
          <div className="mb-1 flex items-center justify-between">
            <div className="font-display text-[14.5px] font-semibold">Recent threads</div>
          </div>

          {state === "error" && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning">
              {errorMessage}
            </div>
          )}

          {state === "ready" && conversations.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center text-text-faint">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-surface-raised text-text-muted">
                <DotIcon />
              </div>
              <div className="text-[13px] font-medium text-text">Nothing here yet</div>
              <div className="mt-1 max-w-[220px] text-[12px] leading-relaxed">
                Start a chat and it&apos;ll show up here, ordered by most recently active.
              </div>
            </div>
          )}

          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="flex items-center gap-3 border-b border-border-soft px-1.5 py-2.5 last:border-none hover:bg-surface-raised"
            >
              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md bg-surface-raised text-text-muted">
                <DotIcon small />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{c.title}</div>
              </div>
              <div className="ml-auto flex-shrink-0 text-[11px] text-text-faint">
                {formatRelativeTime(c.updatedAt)}
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-lg border border-border-soft bg-surface p-[18px]">
          <div className="mb-1 flex items-center justify-between">
            <div className="font-display text-[14.5px] font-semibold">Pinned projects</div>
            <Link href="/projects" className="text-[12px] text-text-faint hover:text-text-muted">
              Manage
            </Link>
          </div>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center gap-2.5 rounded-sm px-1.5 py-2.5 hover:bg-surface-raised"
            >
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${p.color}`} />
              <div className="text-[13px] font-medium">{p.name}</div>
              <div className="ml-auto text-[11.5px] text-text-faint">{p.threadCount}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function DotIcon({ small }: { small?: boolean }) {
  const size = small ? 14 : 15;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
