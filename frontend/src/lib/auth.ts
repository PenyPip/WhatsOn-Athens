import { apiRequestBaseUrl } from "@/lib/apiRequestBase";

const AUTH_TOKEN_KEY = "whatson_jwt";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
};

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

const API_PREFIX = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

function authUrl(path: string) {
  return new URL(`${API_PREFIX}${path}`, apiRequestBaseUrl()).toString();
}

async function parseAuthResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof json?.error?.message === "string" && json.error.message) ||
      (Array.isArray(json?.error?.details?.errors) && json.error.details.errors[0]?.message) ||
      (typeof json?.message === "string" && json.message) ||
      `Σφάλμα ${res.status}`;
    throw new Error(message);
  }
  return (json?.data ?? json) as T;
}

export async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(authUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
  return parseAuthResponse<T>(res);
}

export async function loginWithPassword(identifier: string, password: string) {
  const data = await authFetch<{ jwt: string; user: AuthUser }>("/auth/local", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  setAuthToken(data.jwt);
  return data;
}

export async function registerWithPassword(input: {
  username: string;
  email: string;
  password: string;
}) {
  const data = await authFetch<{ jwt: string; user: AuthUser }>("/auth/local/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(data.jwt);
  return data;
}

export function logoutClient() {
  setAuthToken(null);
}

export async function fetchCurrentUser() {
  return authFetch<AuthUser>("/users/me");
}
