const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";

export async function apiFetch(
    path: string,
    options: RequestInit & { token?: string; timeoutMs?: number } = {}
): Promise<Response> {
  const { token, timeoutMs, headers: extraHeaders, ...rest } = options;
  const headers = new Headers(extraHeaders);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const fetchOptions: RequestInit = { ...rest, headers };

  if (timeoutMs) {
    const controller = new AbortController();
    fetchOptions.signal = controller.signal;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${GATEWAY}${path}`, fetchOptions);
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  return fetch(`${GATEWAY}${path}`, fetchOptions);
}

/** Server-side helper — pass the JWT token extracted from cookie */
export async function apiServer(
    path: string,
    token: string | undefined,
    options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  return apiFetch(path, { ...options, token });
}

/**
 * Safe JSON parse for API responses.
 * Returns parsed data or null if the body is not valid JSON (e.g., HTML error pages).
 */
export async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json") && !ct.includes("text/json")) {
    return null;
  }
  return res.json().catch(() => null) as Promise<T | null>;
}

/**
 * Proxy an API error response as a JSON error reply.
 * Reads the upstream body as JSON if possible, otherwise wraps the status text.
 */
export async function proxyError(upstream: Response): Promise<Response> {
  const body = await safeJson<{ error?: string; message?: string }>(upstream);
  const msg = body?.error ?? body?.message ?? upstream.statusText ?? "Backend error";
  return Response.json({ error: msg }, { status: upstream.status });
}
