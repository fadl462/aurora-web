"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, login, register } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[380px] rounded-lg border border-border-soft bg-surface p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-[26px] w-[26px] flex-shrink-0 rounded-lg bg-gradient-to-br from-aurora-1 via-aurora-2 to-aurora-3" />
          <span className="font-display text-[15.5px] font-semibold tracking-tight">Aurora</span>
        </div>

        <h1 className="mb-1 font-display text-[20px] font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mb-6 text-[13px] text-text-muted">
          {mode === "login" ? "Sign in to continue to your workspace." : "Get started with Aurora AI OS."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-border bg-surface-raised px-3 py-2.5 text-[14px] text-text outline-none focus:border-accent"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-muted">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-border bg-surface-raised px-3 py-2.5 text-[14px] text-text outline-none focus:border-accent"
              placeholder="At least 8 characters"
            />
          </label>

          {error && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-md bg-accent py-2.5 text-[13.5px] font-semibold text-bg transition-colors hover:bg-[#6C99FF] disabled:cursor-default disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="mt-5 w-full text-center text-[12.5px] text-text-faint hover:text-text-muted"
        >
          {mode === "login" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
