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
