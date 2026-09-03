// ─── Universal HTTP API Client ──────────────────────────────────────────────
// A single, abstracted fetch wrapper used for all client-side network calls
// (Razorpay order/verify/refund route handlers, etc.). It centralises:
//   1. Serialisation + JSON content-type headers
//   2. HTTP-status interception (401 → redirect to login, 403 → privileged
//      error, 429 & 5xx → exponential-backoff retries)
//   3. Network/offline detection with a human-friendly message
//   4. Timed AbortSignal so long-hanging requests fail fast instead of
//      blocking a navigation
//
// Components and services MUST route through apiClient<T>() rather than
// scattering raw `fetch()` calls, so the guardrails stay in one place.
// ──────────────────────────────────────────────────────────────────────────────

export interface RequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeoutMs?: number;
  /** When true, 404/204 responses resolve to `null` instead of throwing. */
  allowEmpty?: boolean;
}

/** Typed error carrying the HTTP status and the parsed error body. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data: unknown
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Perform a JSON fetch with retries (429/5xx), 401 interception and an
 * abort timeout. Throws ApiError for non-2xx responses and a plain Error for
 * network/abort/timeout failures.
 */
export async function apiClient<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    allowEmpty = false,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: options.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    // 401 — session expired or invalid. Send the user back to login while
    // preserving the intended destination so they land where they left off.
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        const redirectTo = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.assign(`/login?redirect=${redirectTo}`);
      }
      throw new ApiError(401, "Unauthorized", null);
    }

    // 403 — authenticated but insufficient privilege. Surface plainly;
    // no retry, since retrying can never succeed.
    if (response.status === 403) {
      throw new ApiError(403, "Forbidden: insufficient privileges", null);
    }

    // 429 (rate limit) and 5xx (server fault) are typically transient and
    // worth an exponential-backoff retry before giving up.
    const isTransient = response.status === 429 || response.status >= 500;
    if (isTransient && retries > 0) {
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : retryDelay;

      await new Promise((res) => setTimeout(res, delay));
      return apiClient<T>(url, {
        ...options,
        retries: retries - 1,
        retryDelay: retryDelay * 2, // exponential backoff
      });
    }

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      throw new ApiError(response.status, response.statusText, errorData);
    }

    if (response.status === 204 || (allowEmpty && response.status === 404)) {
      return null as T;
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;

    const err = error as Error;
    if (err.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error(
        "You appear to be offline. Please check your internet connection."
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ── Safe storage wrappers ───────────────────────────────────────────────────
// localStorage/sessionStorage can throw QuotaExceededError once the ~5MB
// domain budget is exhausted. Wrapping every mutation keeps a single storage
// hiccup from crashing the whole client bundle.

export function safeGetStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.warn("LocalStorage quota exceeded. Purging stale keys…", e);
    try {
      window.localStorage.clear();
    } catch {
      /* storage is entirely unavailable — never throw to the UI */
    }
  }
}

export function safeRemoveStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ── Chunk-load failure recovery ─────────────────────────────────────────────
// A new deployment invalidates hashed JS bundles (_next/static/chunks/...).
// Navigating to an uncached subpage then refuses to load and fires an
// unhandledrejection. The fix is a single page reload, which re-fetches the
// latest manifest. Register this once in a client root provider.

export function registerChunkLoadRecovery(): void {
  if (typeof window === "undefined") return;

  const handler = (event: PromiseRejectionEvent) => {
    const message: string =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason?.message ?? event.reason ?? "");

    if (/Loading chunk .* failed/i.test(message)) {
      const currentUrl = window.location.href;
      // Guard against an infinite reload loop if the chunk genuinely cannot
      // be fetched (e.g. hard offline).
      if (safeGetStorage("vitalsync:chunk-reload") !== currentUrl) {
        safeSetStorage("vitalsync:chunk-reload", currentUrl);
        window.location.reload();
      }
    }
  };

  window.addEventListener("unhandledrejection", handler);
}
