import { z } from "zod";
import type { ReadinessVerdict } from "@/generated/prisma";

const AssessmentSchema = z.object({
  technicalKnowledge: z.object({
    score: z.number().min(1).max(5),
    rationale: z.string().min(1),
  }),
  communication: z.object({
    score: z.number().min(1).max(5),
    rationale: z.string().min(1),
  }),
  proposedVerdict: z.enum(["READY", "NEEDS_1_WEEK_PREP", "NEEDS_RESKILLING", "MISMATCH_WITH_JD"]),
  summary: z.string().min(1),
  strengths: z.array(z.string()).optional(),
  gaps: z.array(z.string()).optional(),
  categoryScores: z.array(
    z.object({
      dimension: z.string(),
      value: z.number(),
      rationale: z.string().optional(),
      evidence: z.string().optional(),
      gap: z.string().optional(),
    })
  ).optional(),
  candidateFeedback: z.object({
    prosAndCons: z.array(z.object({
      pros: z.string(),
      cons: z.string()
    })).optional(),
    resumeConsistencyForCandidate: z.array(z.object({
      claim: z.string(),
      consistent: z.boolean(),
      evidence: z.string().optional()
    })).optional(),
    roadmap: z.array(
      z.object({
        day: z.number(),
        focus: z.string(),
        resource: z.string(),
        whyItMatters: z.string().optional(),
        resourceUrl: z.string().optional(),
        category: z.string().optional()
      })
    ).optional(),
  }).optional(),
});

export type AiAssessmentPayload = z.infer<typeof AssessmentSchema>;

export type UtteranceTurn = { speaker: string; text: string; at?: string };

function parseUtterances(transcriptJson: string): UtteranceTurn[] {
  try {
    const doc = JSON.parse(transcriptJson) as { utterances?: UtteranceTurn[] };
    return Array.isArray(doc.utterances) ? doc.utterances : [];
  } catch {
    return [];
  }
}

function heuristicAssessment(utterances: UtteranceTurn[]): AiAssessmentPayload {
  const candidateText = utterances
    .filter((u) => u.speaker === "CANDIDATE")
    .map((u) => u.text)
    .join(" ");
  const depth = Math.min(5, 1 + Math.floor(candidateText.length / 400));
  const comm = Math.min(5, 1 + Math.floor(utterances.filter((u) => u.speaker === "CANDIDATE").length));
  return {
    technicalKnowledge: {
      score: Math.max(1, Math.min(5, depth)),
      rationale:
        "Score based on response depth and detail.",
    },
    communication: {
      score: Math.max(1, Math.min(5, comm)),
      rationale:
        "Score based on dialogue engagement and clarity of turns.",
    },
    proposedVerdict: "NEEDS_1_WEEK_PREP",
    summary:
      "Preliminary assessment based on dialogue depth. Full JD alignment assessment is pending further technical review.",
    strengths: [],
    gaps: ["Full JD alignment assessment is pending further technical review."],
    categoryScores: [
      {
        dimension: "Technical Knowledge",
        value: Math.max(1, Math.min(5, depth)),
        rationale: "Score based on response depth and detail.",
        gap: "Further technical review required.",
      },
      {
        dimension: "Communication",
        value: Math.max(1, Math.min(5, comm)),
        rationale: "Score based on dialogue engagement and clarity of turns.",
      }
    ],
    candidateFeedback: {
      roadmap: [
        { day: 1, focus: "Review core JD requirements", resource: "Company Career Page" },
        { day: 2, focus: "Practice technical communication", resource: "Mock Interviews" }
      ]
    }
  };
}

export async function assessInterviewWithAi(args: {
  jdTitle: string;
  jdText: string;
  resumeSummary?: string;
  candidateLabel?: string;
  transcriptJson: string;
}): Promise<{ payload: AiAssessmentPayload; source: "claude" | "heuristic" }> {
  const utterances = parseUtterances(args.transcriptJson);
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { payload: heuristicAssessment(utterances), source: "heuristic" };
  }

  const dialogue = utterances
    .map((u) => `${u.speaker === "BOT" || u.speaker === "Interviewer" ? "Interviewer" : "Candidate"}: ${u.text}`)
    .join("\n")
    .slice(0, 24000);

  const model = process.env.AI_MODEL ?? "claude-3-haiku-20240307";

  const system = [
    "You are an expert technical hiring assessor.",
    "You must read the job description (JD), optional resume summary, and the interview transcript.",
    "Score ONLY two dimensions on 1–5: TechnicalKnowledge (depth, correctness, relevance to JD) and Communication (clarity, structure, listening, precision).",
    "Ground every score in specific evidence from the transcript—what they said, what was weak, what matched the JD.",
    "proposedVerdict must align with evidence: READY only if both scores are strong and JD fit is credible; MISMATCH_WITH_JD if answers diverge from role needs; NEEDS_RESKILLING for major knowledge gaps; else NEEDS_1_WEEK_PREP for mixed signals.",
    "Return ONLY valid JSON matching the schema in the user message—no markdown fences, no commentary.",
  ].join("\n");

  const user = [
    "Return JSON with exactly these keys:",
    '{"technicalKnowledge":{"score":1-5,"rationale":"string"},"communication":{"score":1-5,"rationale":"string"},"proposedVerdict":"READY|NEEDS_1_WEEK_PREP|NEEDS_RESKILLING|MISMATCH_WITH_JD","summary":"2-4 sentences overall","strengths":["optional bullets"],"gaps":["optional bullets against JD"],"categoryScores":[{"dimension":"string","value":number,"rationale":"string","evidence":"string","gap":"string"}],"candidateFeedback":{"prosAndCons":[{"pros":"string","cons":"string"}],"resumeConsistencyForCandidate":[{"claim":"string","consistent":boolean,"evidence":"string"}],"roadmap":[{"day":number,"focus":"string","resource":"string","whyItMatters":"string","resourceUrl":"string","category":"string"}]}}',
    "",
    `JD title: ${args.jdTitle}`,
    `JD body:\n${args.jdText.slice(0, 12000)}`,
    args.resumeSummary ? `Resume / experience summary (from setup):\n${args.resumeSummary.slice(0, 8000)}` : "",
    args.candidateLabel ? `Candidate label: ${args.candidateLabel}` : "",
    "",
    "Transcript:",
    dialogue || "(empty—score conservatively and explain)",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system,
        temperature: 0.25,
        messages: [
          { role: "user", content: user },
        ],
        max_tokens: 1000,
      }),
    });
    if (!res.ok) {
      return { payload: heuristicAssessment(utterances), source: "heuristic" };
    }
    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
    };
    const raw = data.content?.[0]?.text?.trim();
    if (!raw) {
      return { payload: heuristicAssessment(utterances), source: "heuristic" };
    }
    let json: unknown;
    try {
      // Find JSON block if Claude wrapped it in markdown
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = match ? match[1] : raw;
      json = JSON.parse(jsonString);
    } catch {
      return { payload: heuristicAssessment(utterances), source: "heuristic" };
    }
    const parsed = AssessmentSchema.safeParse(json);
    if (!parsed.success) {
      return { payload: heuristicAssessment(utterances), source: "heuristic" };
    }
    return { payload: parsed.data, source: "claude" };
  } catch {
    return { payload: heuristicAssessment(utterances), source: "heuristic" };
  }
}

export function mergeTranscriptWithAssessment(transcriptJson: string, assessment: AiAssessmentPayload, source: string) {
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(transcriptJson) as Record<string, unknown>;
  } catch {
    doc = { utterances: [], meta: {} };
  }
  const prevMeta =
    doc.meta && typeof doc.meta === "object" && doc.meta !== null ? (doc.meta as Record<string, unknown>) : {};
  doc.meta = {
    ...prevMeta,
    aiAssessment: { ...assessment, scoredAt: new Date().toISOString(), source },
  };
  return JSON.stringify(doc, null, 2);
}

export function verdictForPrisma(v: AiAssessmentPayload["proposedVerdict"]): ReadinessVerdict {
  return v as ReadinessVerdict;
}
