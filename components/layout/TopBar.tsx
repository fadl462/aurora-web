"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { UsageMeter } from "./UsageMeter";

const MODELS = [
  { name: "Auto Mode", sub: "Routes to the best model per task", dot: "bg-gradient-to-br from-aurora-1 via-aurora-2 to-aurora-3" },
  { name: "Aurora Ultra", sub: "Deepest reasoning, slower", dot: "bg-aurora-3" },
  { name: "Claude", sub: "Anthropic", dot: "bg-[#E8825C]" },
  { name: "GPT", sub: "OpenAI", dot: "bg-[#74C08A]" },
  { name: "Gemini", sub: "Google", dot: "bg-aurora-2" },
] as const;

export function TopBar({ breadcrumb }: { breadcrumb: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const model = MODELS[selected];

  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border-soft px-[22px]">
      <div className="text-[13px] text-text-muted">
        <strong className="font-medium text-text">{breadcrumb}</strong>
      </div>

      <div className="flex items-center gap-2.5" ref={wrapRef}>
        <UsageMeter />
        <div className="h-4 w-px bg-border-soft" />
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[12.5px] font-medium"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${model?.dot}`} />
            {model?.name}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[250px] rounded-md border border-border bg-surface-raised p-1.5 shadow-2xl">
              {MODELS.map((m, i) => (
                <button
                  key={m.name}
                  onClick={() => {
                    setSelected(i);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left hover:bg-surface-hover"
                >
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${m.dot}`} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium">{m.name}</span>
                    <span className="block truncate text-[11px] text-text-faint">{m.sub}</span>
                  </span>
                  {i === selected && (
                    <svg className="ml-auto flex-shrink-0 text-aurora-1" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-surface-raised hover:text-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <button
          onClick={() => {
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
