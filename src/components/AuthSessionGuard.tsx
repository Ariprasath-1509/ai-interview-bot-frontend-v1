"use client";

import { useEffect } from "react";
import { redirectToLogin } from "@/lib/clientFetch";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/screening"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Keeps sessions alive on long-lived client pages and redirects to login when refresh fails.
 */
export function AuthSessionGuard() {
  useEffect(() => {
    let cancelled = false;

    async function refreshIfNeeded() {
      if (cancelled) return;
      if (isPublicRoute(window.location.pathname)) return;

      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok && res.status === 401) {
          redirectToLogin();
        }
      } catch {
        // Ignore transient network errors; next interval will retry.
      }
    }

    void refreshIfNeeded();
    const timer = window.setInterval(refreshIfNeeded, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
