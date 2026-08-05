import { useSessionStore } from "@/stores/session-store";
import type { ApiErrorCode } from "@/lib/api/errors";

/** Client-side mirror of lib/api/errors.ts's `{ error: { code, message,
 * field } }` shape (api-spec.md's Conventions) — thrown instead of returned
 * so every query/mutation hook can rely on TanStack Query's own
 * error-handling (`isError`/`error` on the hook result) rather than each
 * call site re-checking a response envelope by hand. */
export class ApiError extends Error {
  status: number;
  code: ApiErrorCode | "unknown";
  field?: string;

  constructor(status: number, code: ApiErrorCode | "unknown", message: string, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

type ApiFetchOptions = {
  method?: string;
  /** JSON-serializable request body — stringified and sent with a
   * `Content-Type: application/json` header. Mutually exclusive with `body`
   * (raw bytes — only `POST /api/community/voice-notes` needs that today). */
  json?: unknown;
  body?: BodyInit;
  headers?: HeadersInit;
};

/**
 * The one fetch wrapper every query/mutation hook calls into — attaches
 * `Authorization: Bearer <token>` from session-store whenever a session
 * exists (most GETs work fine without one; api-spec.md's Conventions list
 * exactly which routes actually require it, enforced server-side regardless
 * of whether this header is sent), and parses a non-2xx response into a
 * typed ApiError instead of every caller re-checking `res.ok` itself.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method, json, body, headers } = options;
  const accessToken = useSessionStore.getState().session?.accessToken;

  const res = await fetch(`/api${path}`, {
    method: method ?? (json !== undefined || body !== undefined ? "POST" : "GET"),
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data?.error as { code?: ApiErrorCode; message?: string; field?: string } | undefined) ?? {};
    throw new ApiError(res.status, err.code ?? "unknown", err.message ?? "Something went wrong.", err.field);
  }
  return data as T;
}

/** Pulls an inline, field-level message off a caught error for a specific
 * form input (api-spec.md's Conventions: `field` is only ever present when
 * an error is attributable to one input) — `undefined` for every other
 * error shape, so a form-level banner (see `errorMessage` below) is what
 * renders instead. */
export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiError && error.field === field ? error.message : undefined;
}

/** The form-level fallback for an error with no `field` (e.g. login's
 * deliberately generic 401) — rendered as an inline banner near the form,
 * never a redirect/toast. */
export function errorMessage(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.field) return undefined;
  return error.message;
}
