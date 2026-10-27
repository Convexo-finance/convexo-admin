// Backend base URL — always from NEXT_PUBLIC_API_URL (inlined at build time).
// The localhost fallback is for `npm run dev` only.
function resolveApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    console.error('NEXT_PUBLIC_API_URL is not set — API calls will fail. Set it in the Vercel project env and redeploy.');
  }
  return 'http://localhost:3001';
}

export const API_URL = resolveApiUrl();

// App-scoped keys (never shared with convexo_frontend's convexo_jwt).
const JWT_KEY = 'convexo_admin_jwt';
const REFRESH_KEY = 'convexo_admin_refresh';

/** Dispatched on `window` when the admin session is no longer usable. */
export const ADMIN_SESSION_CLEARED_EVENT = 'convexo-admin:session-cleared';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
  }
}

// ─── Token storage ────────────────────────────────────────────────────────────

export function getToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(JWT_KEY) : null;
}

export function getRefreshToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
}

export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(JWT_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(JWT_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

interface AdminClaims { exp?: number; isAdmin?: boolean; address?: string }

/** Decodes (does not verify) the access token. Authorization is server-side. */
export function readTokenClaims(token: string | null = getToken()): AdminClaims | null {
  if (!token) return null;
  try {
    const raw = token.split('.')[1];
    if (!raw) return null;
    return JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))) as AdminClaims;
  } catch {
    return null;
  }
}

/** True when a stored session exists whose refresh path is still possible. */
export function hasAdminSession(): boolean {
  const claims = readTokenClaims();
  if (!claims || claims.isAdmin !== true) return false;
  const accessValid = !claims.exp || claims.exp * 1000 > Date.now();
  return accessValid || !!getRefreshToken();
}

function expireSession() {
  clearTokens();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ADMIN_SESSION_CLEARED_EVENT));
}

// ─── Refresh (single-flight, rotation-aware) ──────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

/**
 * Exchanges the refresh token for a new pair. The backend rotates refresh
 * tokens (the presented one is revoked), so BOTH must be stored — keeping the
 * old refresh token would make the next refresh fail. Concurrent 401s share one
 * request. Only a definitive 401 clears the session; network errors / 429 keep it.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
        signal: controller.signal,
      });
      if (res.status === 401) { expireSession(); return null; }
      if (!res.ok) return null;
      const data = await res.json() as { accessToken?: string; refreshToken?: string };
      if (!data.accessToken) return null;
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: { error?: string; message?: string; code?: string } = {};
  try { body = await res.json(); } catch {}
  // Backend errors are { statusCode, error: <class name>, message, code } —
  // `message` is the human-readable part.
  return new ApiError(body.message ?? body.error ?? `HTTP ${res.status}`, res.status, body.code);
}

/**
 * fetch with bearer auth + one silent refresh on 401. A 401 after refresh, or a
 * 403 "Admin access required", ends the session (the dashboard layout listens
 * for ADMIN_SESSION_CLEARED_EVENT and sends the user back to sign-in).
 */
async function authedFetch(path: string, init: RequestInit = {}, headers: Record<string, string> = {}): Promise<Response> {
  const send = (t: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    });

  const token = getToken();
  let res = await send(token);
  if (res.status === 401 && token) {
    const fresh = await refreshAccessToken();
    if (!fresh) { expireSession(); throw new ApiError('Session expired. Please sign in again.', 401); }
    res = await send(fresh);
    if (res.status === 401) expireSession();
  }
  if (res.status === 403 && path.startsWith('/admin')) {
    const err = await toApiError(res);
    if (/admin access required/i.test(err.message)) expireSession();
    throw err;
  }
  return res;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await authedFetch(path, options, {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  // No Content-Type — browser sets multipart/form-data with boundary automatically
  const res = await authedFetch(path, { method: 'POST', body: formData });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}

export async function apiDownload(path: string): Promise<{ blob: Blob; contentType: string; filename: string }> {
  const res = await authedFetch(path);
  if (!res.ok) throw await toApiError(res);

  const blob = await res.blob();
  const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream';
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^";\n]+)"?/);
  const filename = match?.[1] ?? 'document';

  return { blob, contentType, filename };
}
