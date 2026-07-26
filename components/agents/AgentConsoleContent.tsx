"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Agent, AgentRun, PendingApproval } from "@/lib/types";
import { ApiError, decideApproval, getAgent, listAgentRuns, listPendingApprovals } from "@/lib/api";
import { ConsoleTabs } from "./ConsoleTabs";

type LoadState = "loading" | "ready" | "error" | "not-found";

export function AgentConsoleContent({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [agentData, runsData, approvalsData] = await Promise.all([
          getAgent(agentId),
          listAgentRuns(agentId),
          listPendingApprovals(agentId),
        ]);
        if (cancelled) return;
        setAgent(agentData);
        setRuns(runsData);
        setApprovals(approvalsData);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setState("not-found");
          return;
        }
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't load this agent.");
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [agentId, router]);

  async function handleDecision(approvalId: string, decision: "approve" | "deny") {
    // Optimistic removal — the action is fast and low-stakes to retry,
    // and this is exactly the interaction the approval-tier model in
    // docs/07-security-and-compliance.md is meant to make feel immediate.
    const previous = approvals;
    setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    try {
      await decideApproval(agentId, approvalId, decision);
    } catch {
      setApprovals(previous); // roll back on failure
    }
  }

  if (state === "loading") {
    return <div className="p-8 text-[13px] text-text-faint">Loading agent…</div>;
  }

  if (state === "not-found") {
    return (
      <div className="mx-auto max-w-[880px] px-8 pt-7">
        <Link href="/agents" className="mb-4 flex items-center gap-1.5 text-[12.5px] text-text-faint hover:text-text">
          <BackIcon /> Back to Agents
        </Link>
        <div className="rounded-md border border-border-soft bg-surface px-4 py-3 text-[13px] text-text-muted">
          This agent doesn&apos;t exist, or doesn&apos;t belong to your account.
        </div>
      </div>
    );
  }

  if (state === "error" || !agent) {
    return (
      <div className="mx-auto max-w-[880px] px-8 pt-7">
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[880px] overflow-y-auto px-8 pb-16 pt-7">
      <Link href="/agents" className="mb-[18px] flex items-center gap-1.5 text-[12.5px] text-text-faint hover:text-text">
        <BackIcon />
        Back to Agents
      </Link>

      <div className="mb-[22px] flex items-center gap-3.5">
        <div className={`flex h-[46px] w-[46px] items-center justify-center rounded-xl text-[18px] font-semibold ${agent.avatarColorClass}`}>
          {agent.avatarLetter}
        </div>
        <div>
          <div className="font-display text-[20px] font-semibold">{agent.name}</div>
          <div className="mt-0.5 text-[13px] text-text-muted">{agent.description}</div>
        </div>
      </div>

      <ConsoleTabs
        agent={agent}
        runs={runs}
        approvals={approvals}
        onApprove={(id) => handleDecision(id, "approve")}
        onDeny={(id) => handleDecision(id, "deny")}
      />
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
