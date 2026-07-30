"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { decideApproval, listInboxApprovals } from "@/lib/api";
import type { InboxApproval } from "@/lib/types";
import { UsageMeter } from "./UsageMeter";
import { MODEL_OPTIONS, useModel } from "@/lib/model-context";
import { useTheme, type Theme } from "@/lib/theme-context";

const THEME_OPTIONS: { id: Theme; name: string; dot: string }[] = [
  { id: "dark", name: "Dark", dot: "bg-[#12151C] border border-border" },
  { id: "light", name: "Light", dot: "bg-white border border-border" },
  { id: "nebula", name: "Nebula", dot: "bg-gradient-to-br from-aurora-2 via-aurora-3 to-[#0D0A16]" },
];

export function TopBar({ breadcrumb }: { breadcrumb: string }) {
  const router = useRouter();
  const [modelOpen, setModelOpen] = useState(false);
  const { model: selectedId, setModel } = useModel();
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const themeWrapRef = useRef<HTMLDivElement>(null);
  const modelWrapRef = useRef<HTMLDivElement>(null);

  const [inboxOpen, setInboxOpen] = useState(false);
  const [approvals, setApprovals] = useState<InboxApproval[]>([]);
  const [inboxLoaded, setInboxLoaded] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const inboxWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (modelWrapRef.current && !modelWrapRef.current.contains(e.target as Node)) setModelOpen(false);
      if (inboxWrapRef.current && !inboxWrapRef.current.contains(e.target as Node)) setInboxOpen(false);
      if (themeWrapRef.current && !themeWrapRef.current.contains(e.target as Node)) setThemeOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Fetched once on mount so the badge count is accurate before the
  // user ever opens the dropdown, not just after their first click.
  useEffect(() => {
    listInboxApprovals()
      .then((a) => {
        setApprovals(a);
        setInboxLoaded(true);
      })
      .catch(() => setInboxLoaded(true));
  }, []);

  async function handleDecide(approval: InboxApproval, decision: "approve" | "deny") {
    setDecidingId(approval.id);
    try {
      await decideApproval(approval.agentId, approval.id, decision);
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
    } catch {
      // Leave it in the list — the person can just try again, and the
      // agent's own console still has the same approve/deny controls.
    } finally {
      setDecidingId(null);
    }
  }

  const model = MODEL_OPTIONS.find((m) => m.id === selectedId);

  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border-soft px-[22px]">
      <div className="text-[13px] text-text-muted">
        <strong className="font-medium text-text">{breadcrumb}</strong>
      </div>

      <div className="flex items-center gap-2.5">
        <UsageMeter />
        <div className="h-4 w-px bg-border-soft" />
        <div className="relative" ref={modelWrapRef}>
          <button
            onClick={() => setModelOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[12.5px] font-medium"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${model?.dot}`} />
            {model?.name}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {modelOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[250px] rounded-md border border-border bg-surface-raised p-1.5 shadow-2xl">
              {MODEL_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setModel(m.id);
                    setModelOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left hover:bg-surface-hover"
                >
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${m.dot}`} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium">{m.name}</span>
                    <span className="block truncate text-[11px] text-text-faint">{m.sub}</span>
                  </span>
                  {m.id === selectedId && (
                    <svg className="ml-auto flex-shrink-0 text-aurora-1" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={themeWrapRef}>
          <button
            onClick={() => setThemeOpen((v) => !v)}
            title="Theme"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <span className={`h-3.5 w-3.5 rounded-full ${THEME_OPTIONS.find((t) => t.id === theme)?.dot}`} />
          </button>

          {themeOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[170px] rounded-md border border-border bg-surface-raised p-1.5 shadow-2xl">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setThemeOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left hover:bg-surface-hover"
                >
                  <span className={`h-3 w-3 flex-shrink-0 rounded-full ${t.dot}`} />
                  <span className="text-[12.5px] font-medium">{t.name}</span>
                  {t.id === theme && (
                    <svg className="ml-auto flex-shrink-0 text-aurora-1" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={inboxWrapRef}>
          <button
            onClick={() => {
              setInboxOpen((v) => !v);
              if (!inboxOpen) {
                listInboxApprovals()
                  .then(setApprovals)
                  .catch(() => {});
              }
            }}
            title="Approvals inbox"
            className="relative flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {inboxLoaded && approvals.length > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-danger px-[3px] text-[9px] font-semibold text-bg">
                {approvals.length > 9 ? "9+" : approvals.length}
              </span>
            )}
          </button>

          {inboxOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 max-h-[420px] w-[320px] overflow-y-auto rounded-md border border-border bg-surface-raised p-1.5 shadow-2xl">
              <div className="px-2 py-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-text-faint">
                Approvals
              </div>
              {approvals.length === 0 && (
                <div className="px-2.5 py-4 text-center text-[12.5px] text-text-faint">
                  Nothing waiting on you right now.
                </div>
              )}
              {approvals.map((a) => (
                <div key={a.id} className="rounded-sm px-2.5 py-2 hover:bg-surface-hover">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-bg ${a.agentAvatarColorClass}`}
                    >
                      {a.agentAvatarLetter}
                    </span>
                    <span className="text-[11.5px] font-medium text-text-muted">{a.agentName}</span>
                    <span
                      className={`ml-auto rounded-full px-1.5 py-0.5 text-[9.5px] font-medium ${
                        a.tier === "high"
                          ? "bg-danger/10 text-danger"
                          : a.tier === "medium"
                            ? "bg-warning/10 text-warning"
                            : "bg-surface-hover text-text-faint"
                      }`}
                    >
                      {a.tier}
                    </span>
                  </div>
                  <div className="mb-2 text-[12.5px] leading-snug text-text">{a.action}</div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDecide(a, "approve")}
                      disabled={decidingId === a.id}
                      className="flex-1 rounded-sm bg-accent py-1 text-[11.5px] font-semibold text-bg hover:bg-[#6C99FF] disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecide(a, "deny")}
                      disabled={decidingId === a.id}
                      className="flex-1 rounded-sm border border-border py-1 text-[11.5px] font-medium text-text-muted hover:bg-surface-hover disabled:opacity-40"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            // logout() clears local tokens synchronously before its
            // first await — safe to navigate immediately while the
            // server-side revocation finishes in the background.
            logout();
            router.push("/login");
          }}
          title="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-surface-raised hover:text-text"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
