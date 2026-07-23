import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/server/roles";
import { STAFF_ADMIN_ROLES, STAFF_READ_ROLES } from "@/lib/staffRoles";
import { clearAuthCookiesOnResponse } from "@/lib/authCookies";

const STAFF_ROUTE_ROLES = STAFF_READ_ROLES as unknown as UserRole[];

const ROUTE_ALLOWLIST: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin/staff", roles: ["SUPER_ADMIN"] },
  { prefix: "/admin/setup", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/admin/settings", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/admin/master-data", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/admin/questionbank", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/admin/drives", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/admin/test-flow", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/admin/review", roles: STAFF_ROUTE_ROLES },
  { prefix: "/admin/interviews", roles: STAFF_ROUTE_ROLES },
  { prefix: "/admin/candidates", roles: STAFF_ROUTE_ROLES },
  { prefix: "/admin/calendar", roles: STAFF_ROUTE_ROLES },
  { prefix: "/admin", roles: STAFF_ROUTE_ROLES },
  { prefix: "/observer", roles: STAFF_ROUTE_ROLES },
  { prefix: "/compliance", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/dashboard", roles: STAFF_ROUTE_ROLES },
  { prefix: "/drive", roles: STAFF_ROUTE_ROLES },
  { prefix: "/engineer", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/practice", roles: STAFF_ADMIN_ROLES as unknown as UserRole[] },
  { prefix: "/talent", roles: STAFF_ROUTE_ROLES },
  { prefix: "/candidate", roles: ["CANDIDATE"] },
  { prefix: "/interview", roles: ["CANDIDATE", ...STAFF_ROUTE_ROLES] },
];

const PUBLIC = ["/login", "/register", "/forgot-password", "/_next", "/favicon"];

function isPublic(pathname: string) {
  return PUBLIC.some((p) => pathname.startsWith(p));
}

function allowedRoles(pathname: string): UserRole[] | null {
  for (const r of ROUTE_ALLOWLIST) if (pathname.startsWith(r.prefix)) return r.roles;
  return null;
}

/** Decode JWT payload without verification (signature checked by gateway). */
function decodeJwtRole(token: string): UserRole | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return (json.role as UserRole) ?? null;
  } catch {
    return null;
  }
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours sliding window

function clearSessionAndRedirect(req: NextRequest, pathname: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  const res = NextResponse.redirect(url);
  res.cookies.delete("br_jwt");
  res.cookies.delete("br_role");
  res.cookies.delete("br_username");
  res.cookies.delete("br_issued");
  res.cookies.delete("br_admin_source");
  res.cookies.delete("br_branch");
  return res;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    if (pathname.startsWith("/login") && !req.cookies.get("br_refresh")?.value) {
      const res = NextResponse.next();
      clearAuthCookiesOnResponse(res);
      return res;
    }
    return NextResponse.next();
  }

  // API routes: validate JWT exists and is not expired (skip public API endpoints)
  if (pathname.startsWith("/api")) {
    const PUBLIC_API = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
      "/api/auth/refresh",
      "/api/auth/logout",
      "/api/demo/login",
      "/api/health",
      "/api/screening/public",
      "/api/public",
    ];
    if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();

    const token = req.cookies.get("br_jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const issuedStr = req.cookies.get("br_issued")?.value;
    const issued = issuedStr ? parseInt(issuedStr, 10) : 0;
    if (!issued || Date.now() - issued > SESSION_TTL_MS) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const roles = allowedRoles(pathname);
  if (!roles) return NextResponse.next();

  const roleCookie = req.cookies.get("br_role")?.value as UserRole | undefined;
  const token = req.cookies.get("br_jwt")?.value;

  if (!roleCookie || !token) {
    return clearSessionAndRedirect(req, pathname);
  }

  // Validate role from JWT matches cookie to prevent spoofing
  const jwtRole = decodeJwtRole(token);
  if (jwtRole && jwtRole !== roleCookie) {
    return clearSessionAndRedirect(req, pathname);
  }

  // Sliding expiry check
  const issuedStr = req.cookies.get("br_issued")?.value;
  const issued = issuedStr ? parseInt(issuedStr, 10) : 0;
  if (!issued || Date.now() - issued > SESSION_TTL_MS) {
    return clearSessionAndRedirect(req, pathname);
  }

  if (!roles.includes(roleCookie)) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Refresh sliding window
  const res = NextResponse.next();
  res.cookies.set("br_issued", Date.now().toString(), { path: "/", sameSite: "lax" });
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
