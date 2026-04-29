import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/server/roles";

const ROUTE_ALLOWLIST: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin/staff", roles: ["BENCH_MANAGER"] },
  { prefix: "/admin/setup", roles: ["BENCH_MANAGER"] },
  { prefix: "/admin/review", roles: ["BENCH_MANAGER", "ADMIN", "INTERVIEWER", "HR"] },
  { prefix: "/admin/interviews", roles: ["BENCH_MANAGER", "ADMIN", "INTERVIEWER"] },
  { prefix: "/admin", roles: ["BENCH_MANAGER", "ADMIN", "INTERVIEWER", "HR"] },
  { prefix: "/observer", roles: ["BENCH_MANAGER", "INTERVIEWER"] },
  { prefix: "/compliance", roles: ["COMPLIANCE", "ADMIN"] },
  { prefix: "/candidate", roles: ["CANDIDATE"] },
  { prefix: "/interview", roles: ["CANDIDATE", "BENCH_MANAGER", "INTERVIEWER"] },
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
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
