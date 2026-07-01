import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const res = await fetch(`${GATEWAY}/interviews/bulk`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  // Always relay the status from the backend (207 Multi-Status on success)
  return Response.json(data, { status: res.status });
}
