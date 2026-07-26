"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Agent } from "@/lib/types";
import { ApiError, listAgents } from "@/lib/api";

type LoadState = "loading" | "ready" | "error";

export function AgentsContent() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const list = await listAgents();
        if (cancelled) return;
        setAgents(list);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't load your agents.");
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-[980px] overflow-y-auto px-8 pb-16 pt-8">
      <div className="mb-[26px] flex items-center justify-between">
        <div>
          <h1 className="font-display text-[22px] font-semibold">Agents</h1>
          <p className="mt-1 text-[13.5px] text-text-muted">
            Role-scoped assistants with their own tools, memory, and model preference
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2.5 text-[13px] font-semibold text-bg hover:bg-[#6C99FF]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New agent
        </button>
      </div>

      {state === "loading" && <div className="text-[13px] text-text-faint">Loading your agents…</div>}

      {state === "error" && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
          {errorMessage}
        </div>
      )}

      {state === "ready" && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="rounded-lg border border-border-soft bg-surface p-[18px] transition-transform hover:-translate-y-0.5 hover:border-[#33394A]"
            >
              <div
                className={`mb-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-md text-[14px] font-semibold ${agent.avatarColorClass}`}
              >
                {agent.avatarLetter}
              </div>
              <div className="mb-1 text-[14px] font-semibold">{agent.name}</div>
              <div className="mb-3.5 text-[12.5px] leading-relaxed text-text-faint">{agent.description}</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-text-faint">
                  {agent.tools.map((t) => t.name).join(" · ")}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    agent.status === "active" ? "bg-aurora-1/10 text-aurora-1" : "bg-surface-raised text-text-faint"
                  }`}
                >
                  {agent.status === "active" ? "Active" : "Idle"}
                </span>
              </div>
            </Link>
          ))}

          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-soft p-[18px] text-text-faint">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mb-2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <div className="text-[12.5px] font-medium">Build a custom agent</div>
          </div>
        </div>
      )}
    </div>
  );
}
