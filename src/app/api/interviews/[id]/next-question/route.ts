import { z } from "zod";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

const BodySchema = z.object({
  slot: z.number().int().min(1).max(30), // Increased to handle extended interviews
  lastAnswer: z.string().optional().or(z.literal("")),
  utterances: z.array(z.object({ speaker: z.enum(["BOT", "CANDIDATE"]), text: z.string(), at: z.string() })).optional(),
  manipulationCount: z.number().int().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[next-question] Route called");
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return Response.json({ error: "Missing interview id" }, { status: 400 });

  const rawBody = await req.json().catch(() => null);
  const body = BodySchema.safeParse(rawBody);
  if (!body.success) return Response.json({ error: "Invalid body" }, { status: 400 });

  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  console.log("[next-question] Token found:", token ? "YES" : "NO");
  if (!token) {
    console.error("[next-question] No JWT token found in cookies");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  headers["Authorization"] = `Bearer ${token}`;

  // 1. Fetch interview
  const interviewRes = await fetch(`${GATEWAY}/interviews/${id}`, {
    headers,
  }).catch(() => null);
  if (!interviewRes?.ok) {
    console.error(`[next-question] Failed to fetch interview ${id}, status: ${interviewRes?.status}`);
    return Response.json({ error: "Interview not found" }, { status: interviewRes?.status ?? 404 });
  }

  const interview = (await interviewRes.json()) as { jdId: string; planId: string | null; interviewMode?: string };

  // Get interview mode specific limits
  const getMaxSlots = (mode: string): number => {
    switch (mode) {
      case 'SCREENING': return 5;
      case 'L1': return 7;
      case 'L2': return 8;
      case 'L3': return 10;
      case 'L4': return 10;
      default: return 10;
    }
  };

  const maxSlots = getMaxSlots(interview.interviewMode ?? 'L3');
  
  // Check if interview has reached its natural end
  if (body.data.slot > maxSlots) {
    console.log(`[next-question] Interview ${id} reached max slots (${maxSlots}) for mode ${interview.interviewMode}`);
    return Response.json({ 
      question: "Thank you for your detailed responses. We've covered all the planned questions for this interview. You can now mark the interview as complete.",
      terminateInterview: false,
      interviewComplete: true
    });
  }

  // 2. Fetch JD
  let jdTitle = "Target role";
  let jdText = "";
  const jdRes = await fetch(`${GATEWAY}/interviews/jd/${interview.jdId}`, {
    headers,
  }).catch(() => null);
  if (jdRes?.ok) {
    const jd = (await jdRes.json()) as { title?: string; text?: string };
    jdTitle = jd.title ?? jdTitle;
    jdText = jd.text ?? jdText;
  }

  // 3. Fetch plan for focusAreas + resumeSummary + rubricJson + candidateProfileJson
  let focusAreas: string | undefined;
  let resumeSummary: string | undefined;
  let rubricJson: string | undefined;
  let candidateProfileJson: string | undefined;
  if (interview.planId) {
    const planRes = await fetch(`${GATEWAY}/interviews/plans/${interview.planId}`, {
      headers,
    }).catch(() => null);
    if (planRes?.ok) {
      const plan = (await planRes.json()) as { slotsJson?: string; gapMapJson?: string; rubricJson?: string; candidateProfileJson?: string };
      rubricJson = plan.rubricJson;
      candidateProfileJson = plan.candidateProfileJson;
      try {
        const slots = JSON.parse(plan.slotsJson ?? "{}") as { focusAreas?: string };
        focusAreas = slots.focusAreas;
      } catch { /* ignore */ }
      try {
        const gap = JSON.parse(plan.gapMapJson ?? "{}") as { resumeSummary?: string };
        resumeSummary = gap.resumeSummary;
      } catch { /* ignore */ }
    }
  }

  // 4. Forward to ai-service
  const aiRes = await fetch(`${GATEWAY}/ai/next-question`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      slot: body.data.slot,
      lastAnswer: body.data.lastAnswer ?? "",
      utterances: body.data.utterances ?? [],
      jdTitle,
      jdText,
      focusAreas,
      resumeSummary,
      manipulationCount: body.data.manipulationCount ?? 0,
      rubricJson,
      candidateProfileJson,
      interviewMode: interview.interviewMode ?? "L3",
      interviewId: id,
    }),
  }).catch(() => null);

  if (!aiRes?.ok) return Response.json({ error: "AI service unavailable" }, { status: 502 });

  const data = (await aiRes.json()) as { question: string; manipulationDetected?: boolean; terminateInterview?: boolean };
  return Response.json({ 
    question: data.question,
    manipulationDetected: data.manipulationDetected,
    terminateInterview: data.terminateInterview
  });
}
