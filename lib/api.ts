const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const JWT_KEY = 'convexo_admin_jwt';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem('convexo_admin_refresh');
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data.data?.accessToken ?? data.accessToken;
    if (token) localStorage.setItem(JWT_KEY, token);
    return token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(JWT_KEY);

  const doFetch = async (t: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      let body: { error?: string; message?: string; code?: string } = {};
      try { body = await res.json(); } catch {}
      throw new ApiError(
        body.error ?? body.message ?? `HTTP ${res.status}`,
        res.status,
        body.code,
      );
    }

    return res.json() as Promise<T>;
  };

  try {
    return await doFetch(token);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      const newToken = await refreshToken();
      if (newToken) return doFetch(newToken);
    }
    throw err;
  }
}

export function getToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(JWT_KEY) : null;
}

export function clearTokens() {
  localStorage.removeItem(JWT_KEY);
  localStorage.removeItem('convexo_admin_refresh');
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = localStorage.getItem(JWT_KEY);

  const doFetch = async (t: string | null) => {
    const headers: Record<string, string> = {};
    if (t) headers['Authorization'] = `Bearer ${t}`;
    // No Content-Type — browser sets multipart/form-data with boundary automatically

    const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });

    if (!res.ok) {
      let body: { error?: string; message?: string; code?: string } = {};
      try { body = await res.json(); } catch {}
      throw new ApiError(body.error ?? body.message ?? `HTTP ${res.status}`, res.status, body.code);
    }

    return res.json() as Promise<T>;
  };

  try {
    return await doFetch(token);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      const newToken = await refreshToken();
      if (newToken) return doFetch(newToken);
    }
    throw err;
  }
}

export async function apiDownload(path: string): Promise<{ blob: Blob; contentType: string; filename: string }> {
  const token = localStorage.getItem(JWT_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, res.status);
  }

  const blob = await res.blob();
  const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream';
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^";\n]+)"?/);
  const filename = match?.[1] ?? 'document';

  return { blob, contentType, filename };
}
