"use client";

import { useState } from "react";
import { ApiError, createAgent } from "@/lib/api";
import type { Agent, ToolTier } from "@/lib/types";

const TIERS: { id: ToolTier; label: string }[] = [
  { id: "read", label: "Read-only" },
  { id: "low", label: "Low risk" },
  { id: "medium", label: "Medium risk" },
  { id: "high", label: "High risk" },
];

interface ToolRow {
  name: string;
  tier: ToolTier;
}

export function CreateAgentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (agent: Agent) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tools, setTools] = useState<ToolRow[]>([{ name: "", tier: "read" }]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTool(index: number, changes: Partial<ToolRow>) {
    setTools((prev) => prev.map((t, i) => (i === index ? { ...t, ...changes } : t)));
  }

  function addToolRow() {
    setTools((prev) => [...prev, { name: "", tier: "read" }]);
  }

  function removeToolRow(index: number) {
    setTools((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !systemPrompt.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const created = await createAgent({
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        tools: tools.filter((t) => t.name.trim()).map((t) => ({ name: t.name.trim(), tier: t.tier })),
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that agent.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-lg border border-border bg-surface-raised p-6 shadow-2xl"
      >
        <div className="mb-1 font-display text-[16px] font-semibold text-text">Build a custom agent</div>
        <div className="mb-5 text-[12.5px] text-text-faint">
          A real agent — same approve/deny workflow as the built-in ones, scoped to whatever tools you give it.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-text-muted">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Contract Reviewer"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] text-text outline-none placeholder:text-text-faint"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-text-muted">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              placeholder="What this agent is for, in one line"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] text-text outline-none placeholder:text-text-faint"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-text-muted">System prompt</span>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="How this agent should behave, what it should never do, when to ask for approval…"
              className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[13px] leading-relaxed text-text outline-none placeholder:text-text-faint"
              required
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-text-muted">
              Tools <span className="text-text-faint">(optional — a read-only agent needs none)</span>
            </span>
            <div className="flex flex-col gap-2">
              {tools.map((t, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    value={t.name}
                    onChange={(e) => updateTool(i, { name: e.target.value })}
                    placeholder="tool name, e.g. web_search"
                    className="flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-text outline-none placeholder:text-text-faint"
                  />
                  <select
                    value={t.tier}
                    onChange={(e) => updateTool(i, { tier: e.target.value as ToolTier })}
                    className="rounded-md border border-border bg-surface px-2 py-1.5 text-[12.5px] text-text outline-none"
                  >
                    {TIERS.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                  {tools.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeToolRow(i)}
                      className="rounded-md border border-border px-2 text-text-faint hover:bg-surface-hover hover:text-text"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addToolRow}
              className="mt-2 text-[12px] font-medium text-accent hover:underline"
            >
              + Add another tool
            </button>
          </div>

          {error && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
              {error}
            </div>
          )}

          <div className="mt-1 flex gap-2">
            <button
              type="submit"
              disabled={isSaving || !name.trim() || !description.trim() || !systemPrompt.trim()}
              className="flex-1 rounded-md bg-accent py-2.5 text-[13px] font-semibold text-bg hover:bg-[#6C99FF] disabled:cursor-default disabled:opacity-40"
            >
              {isSaving ? "Creating…" : "Create agent"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2.5 text-[13px] font-medium text-text-muted hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
