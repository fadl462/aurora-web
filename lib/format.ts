export function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const diffSeconds = Math.round((now - then) / 1000);

  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Real display name — falls back to the email's local part when the
// account has no name set, rather than a hardcoded placeholder like
// "Fadl". This is a genuinely multi-tenant product now, so any given
// signed-in user must see their own identity, not whoever built it.
export function displayName(user: { name: string | null; email: string } | null): string {
  if (!user) return "there";
  if (user.name && user.name.trim()) return user.name.trim();
  return user.email.split("@")[0] ?? user.email;
}

export function initials(user: { name: string | null; email: string } | null): string {
  const source = user?.name?.trim() || user?.email.split("@")[0] || "";
  if (!source) return "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return (first + second).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

// Real time-of-day greeting and date — computed from the browser's
// actual local clock, not a frozen string. No fabricated location
// (e.g. a hardcoded city) since we don't have real geolocation data for
// whoever's actually signed in.
export function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function todayLabel(): string {
  return new Date()
    .toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();
}
