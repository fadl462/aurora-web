"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const BREADCRUMBS: Record<string, string> = {
  "/": "Dashboard",
  "/chat": "Chat",
  "/canvas": "Canvas · GAYO client brief",
  "/research": "Research",
  "/agents": "Agents",
};

function breadcrumbFor(pathname: string): string {
  if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname];
  if (pathname.startsWith("/agents/")) return "Agents · Console";
  return "Aurora";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="grid h-screen grid-cols-[76px_1fr] md:grid-cols-[248px_1fr]">
      <Sidebar />
      <main className="flex min-w-0 flex-col">
        <TopBar breadcrumb={breadcrumbFor(pathname)} />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
