"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { getCurrentUser, listProjects, type CurrentUser } from "@/lib/api";
import { logout } from "@/lib/auth";
import { displayName, initials } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/chat", label: "Chat" },
  { href: "/canvas", label: "Canvas" },
  { href: "/research", label: "Research" },
  { href: "/agents", label: "Agents" },
  { href: "/projects", label: "Projects" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <aside className="flex flex-col border-r border-border-soft bg-surface p-3.5 md:w-[248px] w-[76px]">
      <div className="flex items-center gap-2.5 px-2 pb-5 pt-1">
        <div className="h-[26px] w-[26px] flex-shrink-0 rounded-lg bg-gradient-to-br from-aurora-1 via-aurora-2 to-aurora-3" />
        <span className="hidden font-display text-[15.5px] font-semibold tracking-tight md:inline">Aurora</span>
      </div>

      <Link
        href="/chat"
        className="mb-[18px] flex items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2.5 text-[13.5px] font-medium transition-colors hover:bg-surface-hover md:justify-start"
      >
        <PlusIcon />
        <span className="hidden md:inline">New chat</span>
      </Link>

      <div className="hidden px-2.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint md:block">
        Workspace
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-center gap-2.5 rounded-sm px-2.5 py-2 text-[13.5px] font-medium transition-colors md:justify-start ${
                active ? "bg-accent/10 text-text" : "text-text-muted hover:bg-surface-raised hover:text-text"
              }`}
            >
              {active && (
                <span className="absolute -left-3.5 top-1.5 bottom-1.5 hidden w-[3px] rounded-full bg-gradient-to-b from-aurora-1 via-aurora-2 to-aurora-3 md:block" />
              )}
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden px-2.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint md:block">
        Projects
      </div>
      <div className="hidden flex-col gap-0.5 md:flex">
        {projects.map((p) => {
          const active = pathname === `/projects/${p.id}`;
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className={`flex items-center gap-2 rounded-sm px-2.5 py-2 text-[13px] font-medium ${
                active ? "bg-accent/10 text-text" : "text-text-muted hover:bg-surface-raised hover:text-text"
              }`}
            >
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${p.color}`} />
              <span className="truncate">{p.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="relative mt-auto hidden border-t border-border-soft pt-3.5 md:block" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-sm p-1.5 text-left hover:bg-surface-raised"
        >
          <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-md bg-surface-raised text-[11px] font-semibold text-text-muted">
            {initials(user)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">{displayName(user)}&apos;s Workspace</div>
            <div className="truncate text-[11px] text-text-faint">{user?.email ?? "…"}</div>
          </div>
        </button>

        {menuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-full min-w-[200px] rounded-md border border-border bg-surface-raised p-1.5 shadow-2xl">
            <div className="px-2.5 py-2 text-[11px] text-text-faint">
              Signed in as
              <div className="truncate text-[12.5px] font-medium text-text">{user?.email ?? "…"}</div>
            </div>
            <div className="my-1 h-px bg-border-soft" />
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[12.5px] font-medium text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
