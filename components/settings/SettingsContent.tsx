"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getCurrentUser, getUsage, listLoginEvents, updateCurrentUser, type CurrentUser, type LoginEvent, type Usage } from "@/lib/api";
import { formatRelativeTime, initials } from "@/lib/format";

type LoadState = "loading" | "ready" | "error";

export function SettingsContent() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [currentUser, currentUsage, events] = await Promise.all([
          getCurrentUser(),
          getUsage(),
          listLoginEvents(),
        ]);
        if (cancelled) return;
        setUser(currentUser);
        setName(currentUser.name ?? "");
        setUsage(currentUsage);
        setLoginEvents(events);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't load your settings.");
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSavedJustNow(false);
    try {
      const updated = await updateCurrentUser({ name });
      setUser(updated);
      setName(updated.name ?? "");
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 2500);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save that.");
    } finally {
      setIsSaving(false);
    }
  }

  if (state === "loading") {
    return <div className="mx-auto max-w-[640px] px-8 pt-11 text-[13px] text-text-faint">Loading your settings…</div>;
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-[640px] px-8 pt-11">
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] overflow-y-auto px-8 pb-16 pt-11">
      <h1 className="mb-1 font-display text-[22px] font-semibold">Settings</h1>
      <p className="mb-8 text-[13.5px] text-text-muted">Your profile and usage for this account.</p>

      <div className="mb-8 rounded-lg border border-border-soft bg-surface p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-surface-raised text-[15px] font-semibold text-text-muted">
            {initials(user)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-semibold text-text">{user?.email}</div>
            <div className="text-[11.5px] text-text-faint">
              Joined {user ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""}
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveName} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-text-muted">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Sady"
              className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-[13.5px] text-text outline-none placeholder:text-text-faint"
            />
            <span className="mt-1 block text-[11px] text-text-faint">
              Leave blank to use the part of your email before the @ instead.
            </span>
          </label>

          {saveError && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
              {saveError}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-bg hover:bg-[#6C99FF] disabled:cursor-default disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            {savedJustNow && <span className="text-[12px] text-aurora-1">Saved.</span>}
          </div>
        </form>
      </div>

      <div className="mb-8 rounded-lg border border-border-soft bg-surface p-5">
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-text-faint">
          Recent sign-ins
        </div>
        <p className="mb-3 text-[11.5px] leading-relaxed text-text-faint">
          Device is detected from your browser. Location is a best-effort estimate from your network's public IP
          address — it can be off by a city or more, and won't resolve at all on a private/local network.
        </p>
        {loginEvents.length === 0 && <div className="text-[12.5px] text-text-faint">No sign-in history yet.</div>}
        <div className="flex flex-col divide-y divide-border-soft">
          {loginEvents.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-text">{e.deviceLabel}</div>
                <div className="truncate text-[11.5px] text-text-faint">{e.locationLabel ?? "Unknown location"}</div>
              </div>
              <div className="flex-shrink-0 text-[11.5px] text-text-faint">{formatRelativeTime(e.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border-soft bg-surface p-5">
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-text-faint">Usage</div>
        {usage && (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13.5px] font-medium text-text">
                {usage.balance.toLocaleString()} tokens remaining
              </span>
              <span className="text-[12px] text-text-faint">
                of {usage.startingBalance.toLocaleString()}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(0, Math.min(100, usage.percentRemaining))}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
