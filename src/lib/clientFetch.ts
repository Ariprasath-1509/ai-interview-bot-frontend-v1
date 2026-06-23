"use client";

/**
 * Client-side fetch wrapper for same-origin API routes.
 * Attempts token refresh once on 401, then redirects to login.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestInit: RequestInit = {
    ...init,
    credentials: init?.credentials ?? "include",
  };

  let response = await fetch(input, requestInit);
  if (response.status !== 401) {
    return response;
  }

  const refreshRes = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!refreshRes.ok) {
    redirectToLogin();
    return response;
  }

  response = await fetch(input, requestInit);
  if (response.status === 401) {
    redirectToLogin();
  }
  return response;
}

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function redirectToLogin() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (isPublicRoute(pathname)) return;

  const next = `${pathname}${search}`;
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}
