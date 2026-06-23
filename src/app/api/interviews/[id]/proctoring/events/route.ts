import { cookies } from "next/headers";
import { z } from "zod";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

const EventSchema = z.object({
  events: z.array(z.record(z.string(), z.unknown())).optional(),
  strikes: z.record(z.string(), z.number()).optional(),
  status: z.string().optional(),
  integrityScore: z.number().int().min(0).max(100).optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!z.string().min(1).safeParse(id).success) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const body = EventSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid body" }, { status: 400 });

  const upstream = await fetch(`${GATEWAY}/interviews/${id}/proctoring/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body.data),
  }).catch(() => null);

  if (!upstream) return Response.json({ error: "Service unreachable" }, { status: 502 });
  const data = await upstream.json().catch(() => ({}));
  return Response.json(data, { status: upstream.status });
}
