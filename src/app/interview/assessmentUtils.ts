export type ScoreRow = {
  id?: string;
  dimension: string;
  value: number;
  rationale?: string;
  evidence?: string;
  gap?: string;
  confidence?: "high" | "medium" | "low";
};

export type ResumeConsistency = {
  consistencyScore: number;
  demonstrated?: string[];
  notDemonstrated?: string[];
  flags?: string[];
};

export type BehavioralSignals = {
  ownership?: string;
  learningAgility?: string;
  communication?: string;
  confidenceCalibration?: string;
  summary?: string;
};

export type InterviewQuality = {
  coverageScore?: number;
  categoriesCovered?: string[];
  covered?: string[];
  categoriesMissed?: string[];
  missed?: string[];
  note?: string;
};

export type ProsConsItem = {
  pros?: string;
  cons?: string;
};

export type RoadmapItem = {
  day?: number | string;
  focus?: string;
  resource?: string;
  whyItMatters?: string;
  resourceUrl?: string;
  category?: string;
};

export type CandidateFeedback = {
  prosAndCons?: ProsConsItem[];
  resumeConsistencyForCandidate?: Array<{ claim: string; consistent: boolean; evidence?: string }>;
  roadmap?: RoadmapItem[];
};

export type AiAssessment = {
  source?: string;
  scoreMax?: number;
  scoredAt?: string;
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  proposedVerdict?: string;
  categoryScores?: ScoreRow[];
  technicalKnowledge?: { score: number; rationale?: string };
  communication?: { score: number; rationale?: string };
  resumeConsistency?: ResumeConsistency;
  behavioralSignals?: BehavioralSignals;
  interviewQuality?: InterviewQuality;
  candidateFeedback?: CandidateFeedback;
  speechAnalytics?: Record<string, unknown>;
};

export type AssessmentBanner = {
  tone: "info" | "warning" | "success" | "amber";
  title: string;
  detail: string;
};

export function parseAiAssessment(transcriptJson: string | null | undefined): AiAssessment | null {
  if (!transcriptJson) return null;
  try {
    const doc = JSON.parse(transcriptJson) as { meta?: { aiAssessment?: AiAssessment } };
    return doc.meta?.aiAssessment ?? null;
  } catch {
    return null;
  }
}

export function countCandidateTurns(transcriptJson: string | null | undefined): number {
  if (!transcriptJson) return 0;
  try {
    const doc = JSON.parse(transcriptJson) as { utterances?: { speaker: string }[] };
    return (doc.utterances ?? []).filter((u) => u.speaker === "CANDIDATE").length;
  } catch {
    return 0;
  }
}

/** Merge review-service scores with transcript / compliance assessment data. */
export function mergeAssessmentScores(
  apiScores: ScoreRow[],
  ai: AiAssessment | null,
  storedAssessment?: { categoryScores?: ScoreRow[] } | null,
): ScoreRow[] {
  if (apiScores.length > 0) return apiScores;
  if (storedAssessment?.categoryScores?.length) {
    return storedAssessment.categoryScores.map((s, i) => ({ ...s, id: s.id ?? `stored-${i}` }));
  }
  if (ai?.categoryScores?.length) {
    return ai.categoryScores.map((s, i) => ({ ...s, id: s.id ?? `ai-${i}` }));
  }
  if (ai?.technicalKnowledge || ai?.communication) {
    const rows: ScoreRow[] = [];
    if (ai.technicalKnowledge) {
      rows.push({
        id: "ai-tk",
        dimension: "TechnicalKnowledge",
        value: ai.technicalKnowledge.score,
        rationale: ai.technicalKnowledge.rationale,
      });
    }
    if (ai.communication) {
      rows.push({
        id: "ai-comm",
        dimension: "Communication",
        value: ai.communication.score,
        rationale: ai.communication.rationale,
      });
    }
    return rows;
  }
  return [];
}

/** Assessment category scores use a 1–10 scale (review UI previously mislabeled as /5). */
export function inferAssessmentScoreMax(
  ai: AiAssessment | null | undefined,
  scores: ScoreRow[],
): number {
  if (typeof ai?.scoreMax === "number" && ai.scoreMax > 0) {
    return ai.scoreMax;
  }
  if (ai?.source === "heuristic") return 5;
  const values = scores.map((s) => s.value).filter((v) => Number.isFinite(v));
  if (values.some((v) => v > 5)) return 10;
  if (values.length > 0 && values.every((v) => v >= 1 && v <= 5)) {
    // Claude uses 1-10 scale; all-low scores are genuinely low, not a scale artifact
    return ai?.source === "heuristic" ? 5 : 10;
  }
  return 10;
}

export function buildAssessmentBanners(opts: {
  ai: AiAssessment | null;
  transcriptJson?: string | null;
  recordingPath?: string | null;
  hasCodeSubmissions?: boolean;
  assessFailed?: boolean;
}): AssessmentBanner[] {
  const banners: AssessmentBanner[] = [];
  const { ai, transcriptJson, recordingPath, hasCodeSubmissions, assessFailed } = opts;

  if (assessFailed) {
    banners.push({
      tone: "warning",
      title: "Assessment incomplete",
      detail: "AI scoring did not finish. Scores below may be preliminary; re-run assessment from the review page.",
    });
  }

  if (!ai?.summary && !ai?.categoryScores?.length && !ai?.technicalKnowledge) {
    banners.push({
      tone: "warning",
      title: "No AI assessment stored",
      detail: "Mark complete may not have persisted scoring. Use Re-run assessment if you are a reviewer.",
    });
  } else if (ai.source === "coding-only") {
    banners.push({
      tone: "amber",
      title: "Coding-focused assessment",
      detail: "Verbal interview had little or no dialogue; Technical Knowledge reflects code tests and AI review. Communication was not fully assessed.",
    });
  } else if (countCandidateTurns(transcriptJson) < 3) {
    banners.push({
      tone: "info",
      title: "Limited verbal transcript",
      detail: hasCodeSubmissions
        ? "Few spoken answers were captured; final scores blend any code submissions with available dialogue."
        : "Few spoken answers were captured; scores rely mainly on limited dialogue depth.",
    });
  }

  if (recordingPath) {
    banners.push({
      tone: "success",
      title: "Session recording available",
      detail: "Full-session audio was uploaded and can be played back below for admin review.",
    });
  }

  return banners;
}

export const BANNER_STYLES: Record<AssessmentBanner["tone"], string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
  warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
  amber: "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100",
};
