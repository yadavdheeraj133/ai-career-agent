/**
 * Thin fetch wrapper around the Express API.
 *
 * The API answers every request with the same envelope
 * (`{ success, message?, data, count? }`) and authenticates with a
 * `Authorization: Bearer <token>` header. The token is kept in localStorage
 * so the client components can attach it without a server round-trip.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ??
  "http://localhost:5000";

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
  errors?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

const TOKEN_STORAGE_KEY = "career_agent_token";

/** Broadcast when the API rejects the stored token, so auth context can reset. */
export const UNAUTHORIZED_EVENT = "career-agent:unauthorized";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Set to false for unauthenticated requests (login/register/forgot). */
  auth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiEnvelope<T>> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = auth ? getToken() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }
  }

  if (response.status === 401 && auth) {
    clearToken();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.errors
    );
  }

  return payload as ApiEnvelope<T>;
}
