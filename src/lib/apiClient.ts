const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<Response> {
  const { token, headers: extraHeaders, ...rest } = options;
  const headers = new Headers(extraHeaders);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${GATEWAY}${path}`, { ...rest, headers });
}

/** Server-side helper — pass the JWT token extracted from cookie */
export async function apiServer(
  path: string,
  token: string | undefined,
  options: RequestInit = {}
): Promise<Response> {
  return apiFetch(path, { ...options, token });
}
