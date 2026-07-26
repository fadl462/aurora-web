"use client";

/**
 * Shared model-selection state. This exists because the model picker in
 * TopBar and the actual chat send call in ChatThread used to be totally
 * disconnected — the picker was local useState with nowhere to go, and
 * every send hardcoded model: "auto" regardless of what was selected.
 *
 * In-memory only (React state via context), deliberately not
 * localStorage/sessionStorage — those aren't supported in this
 * environment and this preference doesn't need to survive a hard
 * refresh; it resets to "auto" each session, which is a reasonable
 * default anyway.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

export type ModelChoice = "auto" | "ultra" | "balanced" | "fast";

export interface ModelOption {
  id: ModelChoice;
  name: string;
  sub: string;
  dot: string;
}

// Every option here maps to a real model on the backend
// (app/orchestration.py's MODEL_MAP). We deliberately do NOT list
// GPT or Gemini — Aurora doesn't call those providers yet, and a
// selectable option with nothing behind it is worse than not having
// it, since picking it would silently do nothing different.
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "auto",
    name: "Auto Mode",
    sub: "Routes to the best model per task",
    dot: "bg-gradient-to-br from-aurora-1 via-aurora-2 to-aurora-3",
  },
  { id: "ultra", name: "Aurora Ultra", sub: "Deepest reasoning, slower", dot: "bg-aurora-3" },
  { id: "balanced", name: "Aurora Balanced", sub: "Everyday chat and writing", dot: "bg-accent" },
  { id: "fast", name: "Aurora Fast", sub: "Quick, simple answers", dot: "bg-[#74C08A]" },
];

interface ModelContextValue {
  model: ModelChoice;
  setModel: (m: ModelChoice) => void;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<ModelChoice>("auto");
  return <ModelContext.Provider value={{ model, setModel }}>{children}</ModelContext.Provider>;
}

export function useModel(): ModelContextValue {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within a ModelProvider");
  return ctx;
}
