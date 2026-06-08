"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Users, X } from "lucide-react";

export interface InterviewRecord {
  interviewId?: string;
  candidateName: string;
  candidateEmail: string;
  interviewMode: string;
  averageScore: number;
  verdict: string;
  jdTitle: string;
  interviewDate?: string;
  scores?: Array<{ dimension: string; value: number }>;
}

export interface CandidateSummary {
  candidateName: string;
  candidateEmail: string;
  interviewCount: number;
  roundCounts: Record<string, number>;
  bestAverageScore: number;
  overallAverageScore: number;
  latestVerdict: string;
  latestJdTitle?: string;
  interviews: InterviewRecord[];
}

export interface SkillWeakness {
  skill: string;
  candidateCount: number;
  percentage: number;
  candidates?: Array<{ candidateName: string; candidateEmail: string }>;
}

export interface CandidatePerformanceData {
  performanceByVerdict: Record<string, number>;
  performanceByMode: Record<string, { totalCandidates: number; readyCandidates: number; successRate: number }>;
  topCandidates?: InterviewRecord[];
  candidateSummaries?: CandidateSummary[];
  commonWeaknesses: SkillWeakness[];
  averageScoresBySkill: Record<string, number>;
  totalAssessedCandidates: number;
  uniqueCandidates?: number;
  overallSuccessRate: number;
  hasData: boolean;
}

function formatSkillLabel(skill: string) {
  return skill
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeSkillKey(skill: string) {
  return skill.replace(/[\s_-]+/g, "").toLowerCase();
}

function dedupeWeaknesses(weaknesses: SkillWeakness[], uniqueCandidates?: number): SkillWeakness[] {
  const byKey = new Map<string, SkillWeakness>();

  for (const weakness of weaknesses) {
    const key = normalizeSkillKey(weakness.skill);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        ...weakness,
        skill: formatSkillLabel(weakness.skill),
      });
      continue;
    }

    const candidateMap = new Map<string, { candidateName: string; candidateEmail: string }>();
    for (const candidate of [...(existing.candidates ?? []), ...(weakness.candidates ?? [])]) {
      candidateMap.set(candidate.candidateEmail, candidate);
    }
    const mergedCandidates = Array.from(candidateMap.values());
    const candidateCount = mergedCandidates.length || Math.max(existing.candidateCount, weakness.candidateCount);

    byKey.set(key, {
      skill: formatSkillLabel(existing.skill.length >= weakness.skill.length ? existing.skill : weakness.skill),
      candidateCount,
      percentage:
        uniqueCandidates && uniqueCandidates > 0
          ? Math.round((candidateCount / uniqueCandidates) * 10000) / 100
          : Math.max(existing.percentage, weakness.percentage),
      candidates: mergedCandidates.length > 0 ? mergedCandidates : existing.candidates ?? weakness.candidates,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => b.candidateCount - a.candidateCount);
}

function dedupeAverageScores(scores: Record<string, number>): Array<[string, number]> {
  const byKey = new Map<string, { label: string; total: number; count: number }>();

  for (const [skill, score] of Object.entries(scores)) {
    const key = normalizeSkillKey(skill);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { label: formatSkillLabel(skill), total: score, count: 1 });
      continue;
    }
    existing.total += score;
    existing.count += 1;
    if (skill.length > existing.label.length) {
      existing.label = formatSkillLabel(skill);
    }
  }

  return Array.from(byKey.values())
    .map(({ label, total, count }) => [label, Math.round((total / count) * 100) / 100] as [string, number])
    .sort(([, a], [, b]) => b - a);
}

function formatVerdict(verdict: string) {
  return verdict.replace(/_/g, " ");
}

function verdictClass(verdict: string) {
  if (verdict === "READY") {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
  if (verdict === "NEEDS_1_WEEK_PREP") {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  }
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

function groupInterviewsByCandidate(records: InterviewRecord[]): CandidateSummary[] {
  const byEmail = new Map<string, InterviewRecord[]>();
  for (const record of records) {
    const key = record.candidateEmail || record.candidateName;
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(record);
  }

  return Array.from(byEmail.values())
    .map((interviews) => {
      const sorted = [...interviews].sort((a, b) =>
        (b.interviewDate ?? "").localeCompare(a.interviewDate ?? "")
      );
      const roundCounts: Record<string, number> = {};
      for (const iv of sorted) {
        roundCounts[iv.interviewMode] = (roundCounts[iv.interviewMode] ?? 0) + 1;
      }
      const scores = sorted.map((i) => i.averageScore);
      const bestAverageScore = Math.max(...scores, 0);
      const overallAverageScore =
        Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;

      return {
        candidateName: sorted[0].candidateName,
        candidateEmail: sorted[0].candidateEmail,
        interviewCount: sorted.length,
        roundCounts,
        bestAverageScore,
        overallAverageScore,
        latestVerdict: sorted[0].verdict,
        latestJdTitle: sorted[0].jdTitle,
        interviews: sorted,
      };
    })
    .sort((a, b) => b.bestAverageScore - a.bestAverageScore);
}

function ScoreBar({ score, className = "w-12" }: { score: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 min-w-[3rem] bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full"
          style={{ width: `${Math.min(100, (score / 5) * 100)}%` }}
        />
      </div>
      <span className="font-mono text-sm w-8">{score}</span>
    </div>
  );
}

function CandidateReportCard({ candidate }: { candidate: CandidateSummary }) {
  return (
    <div className="border-t border-blue-100 bg-blue-50/40 px-4 py-4 dark:border-blue-900/40 dark:bg-blue-950/20">
      <h4 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Interview report — {candidate.candidateName}
      </h4>
      <div className="space-y-3">
        {candidate.interviews.map((iv) => (
          <div
            key={iv.interviewId ?? `${iv.interviewMode}-${iv.interviewDate}`}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {iv.interviewMode}
              </span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${verdictClass(iv.verdict)}`}>
                {formatVerdict(iv.verdict)}
              </span>
              <span className="text-xs text-zinc-500">{iv.interviewDate}</span>
              <span className="text-xs text-zinc-500">· {iv.jdTitle}</span>
            </div>
            <div className="mb-3 max-w-xs">
              <p className="mb-1 text-xs text-zinc-500">Average score</p>
              <ScoreBar score={iv.averageScore} className="w-full max-w-[200px]" />
            </div>
            {iv.scores && iv.scores.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Skill breakdown</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {iv.scores.map((s) => (
                    <div
                      key={s.dimension}
                      className="flex items-center justify-between rounded border border-zinc-100 px-2 py-1 text-xs dark:border-zinc-800"
                    >
                      <span className="truncate pr-2 capitalize">{formatSkillLabel(s.dimension)}</span>
                      <span
                        className={`font-mono font-medium ${
                          s.value < 3 ? "text-red-600" : s.value >= 4 ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPerformanceTab({
  data,
}: {
  data: CandidatePerformanceData | null;
}) {
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (!data) return [];
    if (data.candidateSummaries && data.candidateSummaries.length > 0) {
      return data.candidateSummaries;
    }
    if (data.topCandidates && data.topCandidates.length > 0) {
      return groupInterviewsByCandidate(data.topCandidates);
    }
    return [];
  }, [data]);

  const skillGaps = useMemo(
    () => dedupeWeaknesses(data?.commonWeaknesses ?? [], data?.uniqueCandidates),
    [data]
  );

  const selectedWeakness = useMemo(
    () => skillGaps.find((w) => normalizeSkillKey(w.skill) === normalizeSkillKey(selectedSkill ?? "")),
    [skillGaps, selectedSkill]
  );

  const sortedSkills = useMemo(
    () => dedupeAverageScores(data?.averageScoresBySkill ?? {}),
    [data]
  );

  if (!data?.hasData) {
    return (
      <div className="empty-state">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No candidate data yet</h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Complete interviews to see performance analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Top candidates — one row per person */}
      <div className="panel-card border-l-4 border-l-emerald-500">
        <div className="panel-header">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Top Performing Candidates
          </h3>
          <p className="text-xs text-zinc-500">Click a row to view all interview rounds</p>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Rounds</th>
                <th className="px-4 py-3 font-medium">Best Avg</th>
                <th className="px-4 py-3 font-medium">Overall Avg</th>
                <th className="px-4 py-3 font-medium">Latest Verdict</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const isOpen = expandedEmail === candidate.candidateEmail;
                return (
                  <Fragment key={candidate.candidateEmail}>
                    <tr
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedEmail(isOpen ? null : candidate.candidateEmail)
                      }
                    >
                      <td className="px-4 py-3 text-zinc-400">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {candidate.candidateName}
                        </div>
                        <div className="text-xs text-zinc-500">{candidate.candidateEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {candidate.interviewCount} total
                          </span>
                          {Object.entries(candidate.roundCounts).map(([mode, count]) => (
                            <span
                              key={mode}
                              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              {mode}×{count}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBar score={candidate.bestAverageScore} />
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBar score={candidate.overallAverageScore} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${verdictClass(candidate.latestVerdict)}`}
                        >
                          {formatVerdict(candidate.latestVerdict)}
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <CandidateReportCard candidate={candidate} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success by mode */}
      <div className="panel-card border-l-4 border-l-blue-500">
        <div className="panel-header">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Success Rate by Interview Mode
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3 lg:grid-cols-5">
          {Object.entries(data.performanceByMode).map(([mode, stats]) => (
            <div
              key={mode}
              className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{mode}</div>
              <div className="mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.successRate}%
              </div>
              <div className="text-xs text-zinc-500">
                {stats.readyCandidates}/{stats.totalCandidates} ready
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-500"
                  style={{ width: `${stats.successRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Skill gaps — clickable */}
        <div className="panel-card border-l-4 border-l-amber-500">
          <div className="panel-header">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Common Skill Gaps
            </h3>
            <p className="text-xs text-zinc-500">Click a skill to see affected candidates</p>
          </div>
          <div className="space-y-2 p-5">
            {skillGaps.map((weakness) => {
              const weaknessKey = normalizeSkillKey(weakness.skill);
              const isSelected =
                selectedSkill !== null && normalizeSkillKey(selectedSkill) === weaknessKey;

              return (
              <button
                key={weaknessKey}
                type="button"
                onClick={() =>
                  setSelectedSkill(isSelected ? null : weakness.skill)
                }
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                    : "border-zinc-200 hover:border-amber-200 hover:bg-amber-50/50 dark:border-zinc-800 dark:hover:bg-amber-950/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {weakness.skill}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{weakness.candidateCount} candidates</div>
                  <div className="text-xs text-zinc-500">{weakness.percentage}%</div>
                </div>
              </button>
              );
            })}
          </div>

          {selectedWeakness && (
            <div className="border-t border-amber-100 bg-amber-50/50 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <Users className="h-4 w-4 text-amber-600" />
                  Candidates needing {selectedWeakness.skill}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedSkill(null)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {selectedWeakness.candidates && selectedWeakness.candidates.length > 0 ? (
                <ul className="space-y-2">
                  {selectedWeakness.candidates.map((c) => (
                    <li
                      key={c.candidateEmail}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div>
                        <div className="font-medium">{c.candidateName}</div>
                        <div className="text-xs text-zinc-500">{c.candidateEmail}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">
                  Candidate list loads after interview-service restart (API update).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Average scores — scrollable */}
        <div className="panel-card border-l-4 border-l-purple-500 flex flex-col max-h-[420px]">
          <div className="panel-header shrink-0">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Average Scores by Skill
            </h3>
            <p className="text-xs text-zinc-500">{sortedSkills.length} dimensions</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-3">
            {sortedSkills.map(([skill, score]) => (
              <div key={skill} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {skill}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        score >= 4 ? "bg-green-500" : score >= 3 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm w-8">{score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="panel-card border-l-4 border-l-indigo-500">
        <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {data.uniqueCandidates ?? candidates.length}
            </div>
            <div className="mt-1 text-sm text-zinc-500">Unique Candidates</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {data.totalAssessedCandidates}
            </div>
            <div className="mt-1 text-sm text-zinc-500">Total Interviews</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {data.overallSuccessRate}%
            </div>
            <div className="mt-1 text-sm text-zinc-500">Interview Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {data.performanceByVerdict.READY || 0}
            </div>
            <div className="mt-1 text-sm text-zinc-500">Ready Verdicts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
