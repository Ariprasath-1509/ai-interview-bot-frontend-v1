import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/server/roles";

const ROUTE_ALLOWLIST: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin/staff", roles: ["SUPER_ADMIN"] },
  { prefix: "/admin/setup", roles: ["ADMIN", "SUPER_ADMIN"] },
  { prefix: "/admin/review", roles: ["ADMIN", "SUPER_ADMIN", "RECRUITER"] },
  { prefix: "/admin/interviews", roles: ["ADMIN", "SUPER_ADMIN", "RECRUITER"] },
  { prefix: "/admin/candidates", roles: ["ADMIN", "SUPER_ADMIN"] },
  { prefix: "/admin/calendar", roles: ["ADMIN", "SUPER_ADMIN", "RECRUITER"] },
  { prefix: "/admin/settings", roles: ["ADMIN", "SUPER_ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN", "SUPER_ADMIN", "RECRUITER"] },
  { prefix: "/observer", roles: ["ADMIN", "SUPER_ADMIN", "RECRUITER"] },
  { prefix: "/compliance", roles: ["SUPER_ADMIN", "ADMIN"] },
  { prefix: "/candidate", roles: ["CANDIDATE"] },
  { prefix: "/interview", roles: ["CANDIDATE", "ADMIN", "SUPER_ADMIN", "RECRUITER"] },
];

const PUBLIC = ["/login", "/register", "/api", "/_next", "/favicon"];

function isPublic(pathname: string) {
  return PUBLIC.some((p) => pathname.startsWith(p));
}

function allowedRoles(pathname: string): UserRole[] | null {
  for (const r of ROUTE_ALLOWLIST) if (pathname.startsWith(r.prefix)) return r.roles;
  return null;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const roles = allowedRoles(pathname);
  if (!roles) return NextResponse.next();

  const role = req.cookies.get("br_role")?.value as UserRole | undefined;

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!roles.includes(role)) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
