const ACCESS_TOKEN_KEY = "aurora_token";
const REFRESH_TOKEN_KEY = "aurora_refresh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class AuthError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (body?.detail?.error?.message) return body.detail.error.message;
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // not JSON — use fallback
  }
  return fallback;
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.ok) {
    throw new AuthError(
      await parseErrorMessage(response, "Login failed. Check your email and password."),
      response.status,
    );
  }
  const body = await response.json();
  setTokens(body.access_token, body.refresh_token);
}

export async function register(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new AuthError(await parseErrorMessage(response, "Registration failed."), response.status);
  }
  // Registration succeeded — log in immediately for a one-step signup flow.
  await login(email, password);
}

// Deduplicates concurrent refresh attempts. This matters because the
// refresh token rotates on every use (server-side, see
// auth.redeem_refresh_token) — it's single-use by design. If several
// API calls all hit an expired access token around the same moment,
// each independently calling /refresh would mean only the first
// actually succeeds and every other one gets a 401 for trying to
// reuse an already-rotated token, causing a spurious forced logout for
// someone who did nothing wrong. Sharing one in-flight promise across
// all of them means they all succeed together off a single real
// refresh call.
let refreshPromise: Promise<void> | null = null;

export async function refreshAccessToken(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    throw new AuthError("No session to refresh — please log in.", 401);
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });
      if (!response.ok) {
        clearTokens();
        throw new AuthError(
          await parseErrorMessage(response, "Session expired. Please log in again."),
          response.status,
        );
      }
      const body = await response.json();
      setTokens(body.access_token, body.refresh_token);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (!refreshToken) return;
  // Best-effort real server-side revocation — the person is logged out
  // locally either way, so a network hiccup here shouldn't block that.
  try {
    await fetch(`${API_URL}/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // ignored — see comment above
  }
}
