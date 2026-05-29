import { z } from "zod";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

const BodySchema = z.object({
  transcriptJson: z.string(),
  reason: z.enum(["not_prepared", "time_expired", "ai_manipulation", "tab_switch_violation"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return Response.json({ error: "Missing interview id" }, { status: 400 });

  const rawBody = await req.json().catch(() => null);
  const body = BodySchema.safeParse(rawBody);
  if (!body.success) return Response.json({ error: "Invalid body" }, { status: 400 });

  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${GATEWAY}/interviews/${id}/abandon`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      transcriptJson: body.data.transcriptJson,
      reason: body.data.reason,
    }),
  }).catch(() => null);

  if (!res?.ok) return Response.json({ error: "Failed to abandon interview" }, { status: res?.status ?? 502 });

  return Response.json({ success: true });
}
