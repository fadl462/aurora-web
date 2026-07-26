"use client";

import { useEffect, useState } from "react";
import { getUsage, type Usage } from "@/lib/api";

const POLL_INTERVAL_MS = 15_000;

export function UsageMeter() {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const result = await getUsage();
        if (!cancelled) setUsage(result);
      } catch {
        // Silent — if the user isn't authenticated, the page itself
        // will redirect to /login; the meter just has nothing to show
        // until then rather than duplicating that error handling.
      }
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener("aurora:usage-changed", refresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("aurora:usage-changed", refresh);
    };
  }, []);

  if (!usage) return null;

  const pct = usage.percentRemaining;
  const level: "high" | "medium" | "low" | "critical" = pct > 50 ? "high" : pct > 20 ? "medium" : pct > 5 ? "low" : "critical";

  const fillColor = {
    high: "bg-aurora-1",
    medium: "bg-warning",
    low: "bg-aurora-4",
    critical: "bg-aurora-4",
  }[level];

  const textColor = {
    high: "text-text-muted",
    medium: "text-warning",
    low: "text-aurora-4",
    critical: "text-aurora-4",
  }[level];

  return (
    <div
      className="group relative flex items-center gap-2"
      title={`${usage.balance.toLocaleString()} / ${usage.startingBalance.toLocaleString()} tokens remaining (${pct}%)`}
    >
      {/* Battery-style shell */}
      <div className="flex h-[16px] w-[42px] items-center rounded-[3px] border border-border p-[2px]">
        <div className="h-full w-full overflow-hidden rounded-[1px] bg-surface-raised">
          <div
            className={`h-full transition-all duration-300 ${fillColor} ${level === "critical" ? "animate-pulse" : ""}`}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      </div>
      <div className="h-[7px] w-[2px] rounded-r-sm bg-border" />

      <span className={`text-[11px] font-medium tabular-nums ${textColor}`}>{pct}%</span>

      {/* Tooltip with exact numbers, shown on hover for anyone who wants more than the percentage */}
      <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-30 whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[11px] text-text opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        {usage.balance.toLocaleString()} / {usage.startingBalance.toLocaleString()} tokens left
      </div>
    </div>
  );
}
