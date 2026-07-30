"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, createBillingPortalSession, createCheckoutSession, getCurrentUser, getUsage, listLoginEvents, listPlans, signOutDevice, updateCurrentUser, type CurrentUser, type LoginEvent, type Plan, type Usage } from "@/lib/api";
import { formatRelativeTime, initials } from "@/lib/format";

type LoadState = "loading" | "ready" | "error";

export function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout"); // "success" | "cancelled" | null — set by Stripe Checkout redirect (see routers/billing.py)
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [signedOutEventIds, setSignedOutEventIds] = useState<Set<string>>(new Set());
  const [signingOutId, setSigningOutId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingBusyPlanId, setBillingBusyPlanId] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
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
        const [currentUser, currentUsage, events, plansList] = await Promise.all([
          getCurrentUser(),
          getUsage(),
          listLoginEvents(),
          listPlans(),
        ]);
        if (cancelled) return;
        setUser(currentUser);
        setName(currentUser.name ?? "");
        setUsage(currentUsage);
        setLoginEvents(events);
        setPlans(plansList);
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

  async function handleUpgrade(planId: string) {
    setBillingBusyPlanId(planId);
    setBillingError(null);
    try {
      const url = await createCheckoutSession(planId);
      window.location.href = url;
    } catch (err) {
      setBillingError(err instanceof ApiError ? err.message : "Couldn't start checkout.");
      setBillingBusyPlanId(null);
    }
  }

  async function handleManageBilling() {
    setBillingBusyPlanId("__portal__");
    setBillingError(null);
    try {
      const url = await createBillingPortalSession();
      window.location.href = url;
    } catch (err) {
      setBillingError(err instanceof ApiError ? err.message : "Couldn't open the billing portal.");
      setBillingBusyPlanId(null);
    }
  }

  async function handleSignOutDevice(eventId: string) {
    setSigningOutId(eventId);
    try {
      await signOutDevice(eventId);
      setSignedOutEventIds((prev) => new Set(prev).add(eventId));
    } catch {
      // leave it as-is — the person can just try again
    } finally {
      setSigningOutId(null);
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

      {checkoutStatus === "success" && (
        <div className="mb-6 rounded-md border border-aurora-1/30 bg-aurora-1/10 px-4 py-3 text-[13px] text-aurora-1">
          Subscription active — your new plan's token allowance is applied.
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <div className="mb-6 rounded-md border border-border bg-surface-raised px-4 py-3 text-[13px] text-text-muted">
          Checkout cancelled — no changes were made to your plan.
        </div>
      )}

      <div className="mb-8 rounded-lg border border-border-soft bg-surface p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[11.5px] font-semibold uppercase tracking-wide text-text-faint">Plan</div>
          {user && user.planTier !== "free" && (
            <button
              onClick={handleManageBilling}
              disabled={billingBusyPlanId === "__portal__"}
              className="text-[12px] font-medium text-accent hover:underline disabled:opacity-40"
            >
              {billingBusyPlanId === "__portal__" ? "Opening…" : "Manage billing"}
            </button>
          )}
        </div>

        {billingError && (
          <div className="mb-3 mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
            {billingError}
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = user?.planTier === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-md border p-3.5 ${isCurrent ? "border-accent bg-accent/5" : "border-border-soft bg-surface-raised"}`}
              >
                <div className="mb-0.5 flex items-center gap-1.5 text-[13.5px] font-semibold text-text">
                  {plan.name}
                  {isCurrent && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9.5px] font-medium text-accent">
                      Current
                    </span>
                  )}
                </div>
                <div className="mb-2 text-[12px] text-text-faint">
                  {plan.monthlyPriceUsd === 0 ? "Free" : `$${plan.monthlyPriceUsd}/mo`} ·{" "}
                  {plan.tokenAllowance.toLocaleString()} tokens/mo
                </div>
                {!isCurrent && plan.purchasable && (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={billingBusyPlanId !== null}
                    className="w-full rounded-md bg-accent py-1.5 text-[12px] font-semibold text-bg hover:bg-[#6C99FF] disabled:cursor-default disabled:opacity-40"
                  >
                    {billingBusyPlanId === plan.id ? "Redirecting…" : "Upgrade"}
                  </button>
                )}
                {!isCurrent && !plan.purchasable && (
                  <div className="text-[11.5px] text-text-faint">Default plan for new accounts</div>
                )}
              </div>
            );
          })}
        </div>
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
          {loginEvents.map((e) => {
            const isSignedOut = signedOutEventIds.has(e.id);
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-text">{e.deviceLabel}</div>
                  <div className="truncate text-[11.5px] text-text-faint">
                    {e.locationLabel ?? "Unknown location"}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2.5">
                  <span className="text-[11.5px] text-text-faint">{formatRelativeTime(e.createdAt)}</span>
                  {isSignedOut ? (
                    <span className="text-[11px] text-text-faint">Signed out</span>
                  ) : (
                    <button
                      onClick={() => handleSignOutDevice(e.id)}
                      disabled={signingOutId === e.id}
                      className="text-[11.5px] font-medium text-warning hover:underline disabled:opacity-40"
                    >
                      {signingOutId === e.id ? "Signing out…" : "Sign out"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
