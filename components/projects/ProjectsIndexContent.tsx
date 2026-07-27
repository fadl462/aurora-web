"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { ApiError, createProject, listProjects } from "@/lib/api";

type LoadState = "loading" | "ready" | "error";

const PROJECT_COLORS = ["bg-aurora-1", "bg-aurora-2", "bg-aurora-3", "bg-aurora-4"];

export function ProjectsIndexContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((list) => {
        if (!cancelled) {
          setProjects(list);
          setState("ready");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't load projects.");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
      const project = await createProject(trimmed, color);
      setProjects((prev) => [...prev, project]);
      setNewName("");
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Couldn't create that project.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[760px] overflow-y-auto px-8 pb-16 pt-8">
      <h1 className="mb-1.5 font-display text-[22px] font-semibold tracking-tight">Projects</h1>
      <p className="mb-6 text-[13px] text-text-muted">
        Each project keeps its own chats and documents — nothing here mixes with your personal space or another
        project, by design.
      </p>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New project name"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] text-text outline-none placeholder:text-text-faint focus:border-accent"
        />
        <button
          type="submit"
          disabled={!newName.trim() || creating}
          className="rounded-md bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-bg disabled:cursor-default disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-[12.5px] text-warning">
          {errorMessage}
        </div>
      )}

      {state === "ready" && projects.length === 0 && (
        <div className="py-10 text-center text-[13px] text-text-faint">No projects yet — create your first one above.</div>
      )}

      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex items-center gap-3 rounded-md border border-border-soft bg-surface px-3.5 py-3 hover:border-border-hover"
          >
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${p.color}`} />
            <span className="text-[13.5px] font-medium">{p.name}</span>
            <span className="ml-auto text-[11.5px] text-text-faint">
              {p.threadCount} {p.threadCount === 1 ? "thread" : "threads"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
