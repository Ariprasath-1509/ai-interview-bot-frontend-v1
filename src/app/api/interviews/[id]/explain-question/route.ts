import { z } from "zod";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

const BodySchema = z.object({
  questionText: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return Response.json({ error: "Missing interview id" }, { status: 400 });

  const rawBody = await req.json().catch(() => null) as unknown;
  const body = BodySchema.safeParse(rawBody);
  if (!body.success) return Response.json({ error: "Invalid body" }, { status: 400 });

  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Best-effort role context — the explanation still works without it
  let interviewMode: string | undefined;
  let jdTitle: string | undefined;
  const interviewRes = await fetch(`${GATEWAY}/interviews/${id}`, { headers }).catch(() => null);
  if (interviewRes?.ok) {
    const interview = (await interviewRes.json()) as { interviewMode?: string; jdId?: string };
    interviewMode = interview.interviewMode;
    if (interview.jdId) {
      const jdRes = await fetch(`${GATEWAY}/interviews/jd/${interview.jdId}`, { headers }).catch(() => null);
      if (jdRes?.ok) jdTitle = ((await jdRes.json()) as { title?: string }).title;
    }
  }

  const aiRes = await fetch(`${GATEWAY}/ai/explain-question`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      questionText: body.data.questionText,
      jdTitle,
      interviewMode,
      interviewId: id,
    }),
  }).catch(() => null);

  if (!aiRes?.ok) return Response.json({ error: "AI service unavailable" }, { status: 502 });
  const data = (await aiRes.json()) as { explanation?: string };
  if (!data.explanation) return Response.json({ error: "No explanation returned" }, { status: 502 });

  return Response.json({ explanation: data.explanation });
}
