const TOKEN_KEY = "aurora_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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
  setToken(body.access_token);
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

export function logout(): void {
  clearToken();
}
