import { z } from "zod";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

// Per-interview in-flight lock: prevents duplicate concurrent calls
const inFlight = new Map<string, Promise<Response>>();

const BodySchema = z.object({
  slot: z.number().int().min(1).max(60), // Timer-based interviews — no fixed question count
  lastAnswer: z.string().optional().or(z.literal("")),
  utterances: z.array(z.object({ speaker: z.enum(["BOT", "CANDIDATE"]), text: z.string(), at: z.string() })).optional(),
  manipulationCount: z.number().int().optional(),
});

async function handleNextQuestion(req: Request, id: string): Promise<Response> {

  const rawBody = await req.json().catch(() => null) as unknown;
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

  const interview = (await interviewRes.json()) as { 
    jdId: string; 
    planId: string | null; 
    interviewMode?: string;
    includeProgrammingQuestions?: boolean;
    questionBankQuestionsJson?: string;
    customQuestionsJson?: string;
    usedQuestionIds?: string;
  };

  // No slot cap — interview runs until the candidate's timer expires.
  // The AI generates questions continuously; the frontend timer controls session length.

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
      includeProgrammingQuestions: interview.includeProgrammingQuestions !== false,
      questionBankQuestionsJson: interview.questionBankQuestionsJson,
      customQuestionsJson: interview.customQuestionsJson,
      usedQuestionIds: interview.usedQuestionIds ?? "",
    }),
  }).catch(() => null);

  if (!aiRes?.ok) return Response.json({ error: "AI service unavailable" }, { status: 502 });

  const data = (await aiRes.json()) as { 
    question: string; 
    manipulationDetected?: boolean; 
    terminateInterview?: boolean;
    questionBankId?: string;
    source?: string;
    isCoding?: boolean;
    preferredLanguage?: string;
    starterCode?: string | null;
  };
  
  // Update used question IDs if a question bank question was selected
  if (data.questionBankId) {
    const currentUsedIds = interview.usedQuestionIds ?? "";
    const updatedUsedIds = currentUsedIds ? `${currentUsedIds},${data.questionBankId}` : data.questionBankId;
    
    await fetch(`${GATEWAY}/interviews/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ usedQuestionIds: updatedUsedIds }),
    }).catch((err) => console.error("Failed to update usedQuestionIds:", err));
  }
  
  const slot = body.data.slot;
  const isCoding = data.isCoding ?? false;

  const lastAnswer = (body.data.lastAnswer ?? "").trim();
  if (lastAnswer.length > 0 && slot > 1) {
    await fetch(`${GATEWAY}/interviews/${id}/answers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ slot: slot - 1, answerText: lastAnswer }),
    }).catch((err) => console.warn("[next-question] Failed to persist answer:", err));
  }

  // Persist question slot to interview-service (best effort)
  await fetch(`${GATEWAY}/interviews/${id}/questions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      slot,
      questionText: data.question,
      questionType: isCoding ? "CODING" : "TECHNICAL",
      questionBankId: data.questionBankId ?? undefined,
      source: data.source ?? "AI_GENERATED",
      isCoding,
    }),
  }).catch((err) => console.warn("[next-question] Failed to persist question slot:", err));

  return Response.json({ 
    question: data.question,
    manipulationDetected: data.manipulationDetected,
    terminateInterview: data.terminateInterview,
    questionBankId: data.questionBankId,
    source: data.source,
    isCoding,
    preferredLanguage: data.preferredLanguage ?? "python",
    starterCode: data.starterCode ?? null,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[next-question] Route called");
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) return Response.json({ error: "Missing interview id" }, { status: 400 });

  const existing = inFlight.get(id);
  if (existing) {
    console.log(`[next-question] Duplicate call for interview ${id} — returning in-flight response`);
    // Clone the in-flight response so both callers get a readable body
    return existing.then((r) => r.clone());
  }

  const promise = handleNextQuestion(req, id).finally(() => inFlight.delete(id));
  inFlight.set(id, promise);
  return promise;
}
