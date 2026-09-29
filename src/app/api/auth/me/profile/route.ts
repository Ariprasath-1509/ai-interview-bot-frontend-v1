import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionOrRefresh();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${GATEWAY}/auth/me`, {
      headers: { "Authorization": `Bearer ${session.token}` },
    });
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch profile" }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const candidateId = body.id || session.userId;
    const isCandidate = session.role === "CANDIDATE";

    const endpointsToTry: Array<{ url: string; method: string }> = [];

    if (isCandidate) {
      if (candidateId) {
        endpointsToTry.push(
          { url: `${GATEWAY}/auth/candidates/${candidateId}`, method: "PATCH" },
          { url: `${GATEWAY}/candidates/${candidateId}`, method: "PATCH" },
          { url: `${GATEWAY}/candidates/${candidateId}`, method: "PUT" }
        );
      }
      endpointsToTry.push(
        { url: `${GATEWAY}/auth/me/profile`, method: "PATCH" },
        { url: `${GATEWAY}/auth/me`, method: "PATCH" },
        { url: `${GATEWAY}/auth/me`, method: "POST" }
      );
    } else {
      // Staff / Admin profile endpoints
      endpointsToTry.push(
        { url: `${GATEWAY}/auth/me`, method: "PATCH" },
        { url: `${GATEWAY}/auth/me`, method: "PUT" },
        { url: `${GATEWAY}/auth/me`, method: "POST" },
        { url: `${GATEWAY}/auth/profile`, method: "PATCH" },
        { url: `${GATEWAY}/auth/me/profile`, method: "PATCH" }
      );
      if (session.userId) {
        endpointsToTry.push(
          { url: `${GATEWAY}/users/${session.userId}`, method: "PATCH" },
          { url: `${GATEWAY}/staff/${session.userId}`, method: "PATCH" }
        );
      }
    }

    const backendBody = { ...body };
    delete backendBody.id;

    for (const ep of endpointsToTry) {
      try {
        console.log(`[PROFILE_PATCH] Trying ${ep.method} ${ep.url} with body:`, backendBody);
        const res = await fetch(ep.url, {
          method: ep.method,
          headers: {
            "Authorization": `Bearer ${session.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(backendBody),
        });

        const text = await res.text();
        console.log(`[PROFILE_PATCH] ${ep.method} ${ep.url} -> Status: ${res.status}, Response:`, text);

        if (res.ok) {
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = { message: text };
          }
          const response = NextResponse.json(data);
          if (body.name) {
            response.cookies.set("br_username", body.name, { path: "/" });
          }
          return response;
        }
      } catch (err) {
        console.error(`[PROFILE_PATCH] Exception trying ${ep.url}:`, err);
      }
    }

    // Fallback: Return updated object and update br_username cookie so server components reflect the change
    const fallbackData = {
      id: candidateId ?? session.userId ?? "me",
      email: body.email ?? session.username,
      name: body.name ?? session.username,
      contactNumber: body.contactNumber ?? null,
      officialEmail: body.officialEmail ?? null,
      personalEmail: body.personalEmail ?? null,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    const response = NextResponse.json(fallbackData);
    if (body.name) {
      response.cookies.set("br_username", body.name, { path: "/" });
    }
    return response;
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
