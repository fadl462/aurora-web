"use client";

/**
 * Theme state: dark (default) or light, persisted across sessions.
 *
 * Deliberately hand-rolled rather than pulling in next-themes — as of
 * this writing it has documented unresolved issues on React 19, and
 * this is a small enough piece of state that a dependency isn't worth
 * the risk. The flash-of-wrong-theme problem this kind of library
 * exists to solve is handled directly in app/layout.tsx via a small
 * blocking inline script that runs before paint — see the comment
 * there for why.
 *
 * localStorage is appropriate here (unlike Claude Artifacts, this is a
 * real deployed Next.js app running in a normal browser) — the theme
 * preference should survive a refresh, same as any real product.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "aurora-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts at "dark" to match the server-rendered default and the
  // blocking inline script's fallback — then syncs to whatever's
  // actually in localStorage once mounted. This can only mismatch for
  // a single frame on a returning light-mode visitor, and the inline
  // script (which runs before React even loads) already prevents that
  // from being visible.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
