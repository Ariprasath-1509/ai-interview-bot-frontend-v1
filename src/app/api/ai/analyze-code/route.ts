import { cookies } from "next/headers";

export const runtime = "nodejs";
const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const upstream = await fetch(`${GATEWAY}/ai/analyze-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!upstream) return Response.json({ error: "AI service unreachable" }, { status: 502 });
  const data = await upstream.json().catch(() => ({}));
  return Response.json(data, { status: upstream.status });
}
