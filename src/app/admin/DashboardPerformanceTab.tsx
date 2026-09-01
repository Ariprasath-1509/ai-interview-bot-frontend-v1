"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Users, X, Calendar, Briefcase, Award } from "lucide-react";

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
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold shadow-xs";
  }
  if (verdict === "NEEDS_1_WEEK_PREP") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold shadow-xs";
  }
  if (verdict === "NEEDS_RESKILLING") {
    return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 font-semibold shadow-xs";
  }
  if (verdict === "MISMATCH_WITH_JD") {
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold shadow-xs";
  }
  return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-semibold shadow-xs";
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

function ScoreBar({ score, className = "w-32" }: { score: number; className?: string }) {
  const maxVal = score > 5 ? 10 : 5;
  const percentage = Math.min(100, Math.max(0, (score / maxVal) * 100));
  const color =
    score >= (maxVal * 0.75)
      ? "from-emerald-500 to-teal-400"
      : score >= (maxVal * 0.5)
      ? "from-amber-500 to-yellow-400"
      : "from-rose-500 to-pink-500";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 min-w-[3.5rem] bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-full h-2.5 overflow-hidden p-[1.5px] shadow-inner">
        <div
          className={`bg-gradient-to-r ${color} h-full rounded-full transition-all duration-500 shadow-xs`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-xs font-bold w-5 text-right shrink-0 text-[var(--text-primary)]">{score}</span>
    </div>
  );
}

function CandidateReportCard({ candidate }: { candidate: CandidateSummary }) {
  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)]/60 px-5 py-5 rounded-b-2xl shadow-inner">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-4 w-4 text-[var(--color-primary)]" />
        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
          Interview report — {candidate.candidateName}
        </h4>
      </div>
      <div className="space-y-3.5">
        {candidate.interviews.map((iv) => (
          <div
            key={iv.interviewId ?? `${iv.interviewMode}-${iv.interviewDate}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="whitespace-nowrap rounded-md bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {iv.interviewMode}
                </span>
                <span className={`whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs ${verdictClass(iv.verdict)}`}>
                  {formatVerdict(iv.verdict)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-wrap">
                {iv.interviewDate && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Calendar size={12} className="opacity-70" />
                    {iv.interviewDate}
                  </span>
                )}
                {iv.jdTitle && (
                  <span className="flex items-center gap-1 font-medium text-[var(--text-primary)] truncate max-w-[200px]" title={iv.jdTitle}>
                    <Briefcase size={12} className="opacity-70 shrink-0" />
                    <span className="truncate">{iv.jdTitle}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="mb-3 max-w-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Average score</p>
              <ScoreBar score={iv.averageScore} className="w-full max-w-[220px]" />
            </div>
            {iv.scores && iv.scores.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Skill breakdown</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {iv.scores.map((s) => {
                    const skillName = formatSkillLabel(s.dimension);
                    const isLongName = skillName.length > 20;

                    return (
                      <div
                        key={s.dimension}
                        className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]/50 px-3 py-1.5 min-h-[36px] transition-colors hover:bg-[var(--surface-subtle)]"
                      >
                        <span
                          className={`min-w-0 flex-1 pr-2 font-medium capitalize text-[var(--text-primary)] leading-tight ${
                            isLongName ? "text-[10px] sm:text-[11px]" : "text-xs"
                          }`}
                          title={skillName}
                        >
                          {skillName}
                        </span>
                        <span
                          className={`font-mono font-bold shrink-0 ${
                            isLongName ? "text-xs" : "text-xs sm:text-sm"
                          } ${
                            s.value < 3 ? "text-rose-600 dark:text-rose-400" : s.value >= 4 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {s.value}
                        </span>
                      </div>
                    );
                  })}
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
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="panel-header panel-header-accent-blue">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Top Performing Candidates
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">Click a row to view all interview rounds</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)]/70 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                <th className="px-4 py-3.5 w-10 text-center" />
                <th className="px-4 py-3.5 font-bold">Candidate</th>
                <th className="px-4 py-3.5 font-bold">Rounds</th>
                <th className="px-4 py-3.5 font-bold">Best Avg</th>
                <th className="px-4 py-3.5 font-bold">Overall Avg</th>
                <th className="px-4 py-3.5 font-bold">Latest Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {candidates.map((candidate) => {
                const isOpen = expandedEmail === candidate.candidateEmail;
                const initials = candidate.candidateName
                  ? candidate.candidateName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "C";

                return (
                  <Fragment key={candidate.candidateEmail}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]/70"
                      onClick={() =>
                        setExpandedEmail(isOpen ? null : candidate.candidateEmail)
                      }
                    >
                      <td className="px-4 py-4 text-center text-[var(--text-secondary)]">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-[var(--color-primary)] transition-transform" />
                        ) : (
                          <ChevronRight className="h-4 w-4 transition-transform" />
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-xs font-bold text-[var(--color-primary)] border border-indigo-500/20 shadow-xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--text-primary)] truncate max-w-[180px] sm:max-w-[220px]" title={candidate.candidateName}>
                              {candidate.candidateName}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate max-w-[180px] sm:max-w-[220px]" title={candidate.candidateEmail}>{candidate.candidateEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="whitespace-nowrap rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                            {candidate.interviewCount} total
                          </span>
                          {Object.entries(candidate.roundCounts).map(([mode, count]) => (
                            <span
                              key={mode}
                              className="whitespace-nowrap rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-500/20"
                            >
                              {mode}×{count}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <ScoreBar score={candidate.bestAverageScore} />
                      </td>
                      <td className="px-4 py-4">
                        <ScoreBar score={candidate.overallAverageScore} />
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`whitespace-nowrap inline-block rounded-full px-3 py-1 text-xs ${verdictClass(candidate.latestVerdict)}`}
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
        <div className="panel-header panel-header-accent-blue">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Success Rate by Interview Mode
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3 lg:grid-cols-5">
          {Object.entries(data.performanceByMode).map(([mode, stats]) => (
            <div
              key={mode}
              className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:from-blue-500/15 dark:to-indigo-500/5"
            >
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{mode}</div>
              <div className="mb-1 text-2xl font-bold text-[var(--text-primary)]">
                {stats.successRate}%
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-medium">
                {stats.readyCandidates}/{stats.totalCandidates} ready
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-[var(--surface-subtle)] overflow-hidden border border-[var(--border)]">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  style={{ width: `${stats.successRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        {/* Skill gaps — clickable */}
        <div className="panel-card border-l-4 border-l-amber-500 flex flex-col max-h-[540px] overflow-hidden">
          <div className="panel-header shrink-0">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Common Skill Gaps
            </h3>
            <p className="text-xs text-zinc-500">Click a skill to see affected candidates</p>
          </div>
          <div className="space-y-2 p-5 overflow-y-auto min-h-0 flex-1">
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
            <div className="border-t border-amber-100 bg-amber-50/50 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-950/20 shrink-0">
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
                <ul className="space-y-2 max-h-36 overflow-y-auto">
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
        <div className="panel-card border-l-4 border-l-purple-500 flex flex-col max-h-[540px] overflow-hidden">
          <div className="panel-header panel-header-accent-purple shrink-0">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Average Scores by Skill
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">{sortedSkills.length} dimensions</p>
          </div>
          <div className="space-y-2 p-5 overflow-y-auto min-h-0 flex-1">
            {sortedSkills.map(([skill, score]) => (
              <div
                key={skill}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 shadow-2xs transition-all duration-200 hover:border-purple-300/50 hover:bg-[var(--surface-subtle)]/60 hover:shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shrink-0" />
                  <span
                    className="min-w-0 truncate text-xs sm:text-sm font-semibold text-[var(--text-primary)] tracking-tight"
                    title={skill}
                  >
                    {skill}
                  </span>
                </div>
                <ScoreBar score={score} className="w-36 shrink-0" />
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
