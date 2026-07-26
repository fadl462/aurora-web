"use client";

import { useState } from "react";
import type { Agent, AgentRun, PendingApproval, ToolTier } from "@/lib/types";

const TIER_COLOR: Record<ToolTier, string> = {
  read: "bg-aurora-1",
  low: "bg-aurora-2",
  medium: "bg-warning",
  high: "bg-aurora-4",
};

const TIER_LABEL: Record<ToolTier, string> = {
  read: "READ-ONLY",
  low: "LOW RISK — WRITE",
  medium: "MEDIUM RISK — WRITE",
  high: "HIGH RISK — EXTERNAL",
};

type Tab = "config" | "runs" | "approvals";

export function ConsoleTabs({
  agent,
  runs,
  approvals,
  onApprove,
  onDeny,
}: {
  agent: Agent;
  runs: AgentRun[];
  approvals: PendingApproval[];
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("config");

  return (
    <div>
      <div className="mb-[22px] flex gap-5 border-b border-border-soft">
        <TabButton active={tab === "config"} onClick={() => setTab("config")}>
          Configuration
        </TabButton>
        <TabButton active={tab === "runs"} onClick={() => setTab("runs")}>
          Run history
        </TabButton>
        <TabButton active={tab === "approvals"} onClick={() => setTab("approvals")}>
          Approvals {approvals.length > 0 && <span className="ml-1 rounded-full bg-surface-raised px-1.5 py-0.5 text-[10.5px]">{approvals.length}</span>}
        </TabButton>
      </div>

      {tab === "config" && (
        <div>
          <Field label="System prompt">
            <div className="rounded-md border border-border-soft bg-surface px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-text-muted">
              {agent.systemPrompt}
            </div>
          </Field>
          <Field label="Allowed tools &amp; approval tier">
            <div className="flex flex-wrap gap-2">
              {agent.tools.map((t) => (
                <span key={t.name} className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface px-2.5 py-1.5 text-[12px] font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${TIER_COLOR[t.tier]}`} title={TIER_LABEL[t.tier]} />
                  {t.name}
                </span>
              ))}
            </div>
          </Field>
        </div>
      )}

      {tab === "runs" && (
        <div>
          {runs.length === 0 ? (
            <EmptyState title="No runs yet" sub="This agent hasn't been used yet — its history will show up here once it runs." />
          ) : (
            runs.map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-border-soft py-3 last:border-none">
                <RunStatusIcon status={r.status} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{r.title}</div>
                  <div className="text-[11.5px] text-text-faint">{r.meta}</div>
                </div>
                <div className="ml-auto flex-shrink-0 text-[11.5px] text-text-faint">{r.timeLabel}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "approvals" && (
        <div>
          {approvals.length === 0 ? (
            <EmptyState
              title="Nothing waiting on you"
              sub="This agent's actions are all read-only or auto-approved at its current tier."
            />
          ) : (
            approvals.map((a) => (
              <div key={a.id} className="mb-2.5 rounded-md border border-border-soft bg-surface px-4 py-3.5">
                <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold text-warning">
                  <span className={`h-1.5 w-1.5 rounded-full ${TIER_COLOR[a.tier]}`} />
                  {TIER_LABEL[a.tier]}
                </div>
                <div className="mb-2.5 text-[13px] font-medium">{a.action}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(a.id)}
                    className="flex-1 rounded-sm bg-accent py-1.5 text-[12.5px] font-semibold text-bg hover:bg-[#6C99FF]"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onDeny(a.id)}
                    className="flex-1 rounded-sm border border-border bg-surface-raised py-1.5 text-[12.5px] font-semibold text-text-muted hover:text-text"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 py-2.5 text-[13px] font-medium ${
        active ? "border-accent text-text" : "border-transparent text-text-faint hover:text-text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-text-faint">{label}</div>
      {children}
    </div>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center text-text-faint">
      <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-md bg-surface-raised text-text-muted">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <div className="mb-1 text-[13.5px] font-semibold text-text">{title}</div>
      <div className="max-w-[260px] text-[12.5px] leading-relaxed">{sub}</div>
    </div>
  );
}

function RunStatusIcon({ status }: { status: AgentRun["status"] }) {
  if (status === "running") {
    return (
      <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-md bg-aurora-1/10 text-aurora-1">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  );
}
