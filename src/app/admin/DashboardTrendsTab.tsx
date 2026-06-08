"use client";

import { useMemo, useState } from "react";
import { SectionHeader, StatCard } from "@/components/common/AppUi";

export interface TrendPoint {
  label?: string;
  date?: string;
  week?: string;
  interviews: number;
  completed: number;
  successRate?: number;
}

export interface MarketSkillTrend {
  skill: string;
  positionsNeeded: number;
  benchNeeded: number;
  marketNeeded: number;
  clientCount?: number;
}

export interface MarketRoleTrend {
  role: string;
  count: number;
}

export interface MarketTrends {
  period?: string;
  activeClients?: number;
  benchDemand?: number;
  marketDemand?: number;
  topSkills?: MarketSkillTrend[];
  topRoles?: MarketRoleTrend[];
  hasData?: boolean;
}

export interface TrendsResponse {
  dailyTrends?: TrendPoint[];
  weeklyTrends?: TrendPoint[];
  marketTrends?: MarketTrends;
  hasData?: boolean;
  generatedAt?: string;
}

function formatSkillLabel(code: string) {
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function TrendBarChart({
  points,
  emptyHint,
}: {
  points: TrendPoint[];
  emptyHint: string;
}) {
  const max = useMemo(
    () => Math.max(1, ...points.flatMap((p) => [p.interviews, p.completed])),
    [points]
  );

  if (points.length === 0) {
    return (
      <div className="empty-state text-sm text-zinc-500">{emptyHint}</div>
    );
  }

  const allZero = points.every((p) => p.interviews === 0 && p.completed === 0);

  return (
    <div>
      {allZero && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          No interview activity in this period yet — bars will fill as interviews are created and completed.
        </p>
      )}
      <div className="flex h-56 items-end justify-between gap-2">
        {points.map((point, idx) => (
          <div key={point.label ?? point.date ?? point.week ?? idx} className="flex flex-1 flex-col items-center">
            <div className="mb-2 flex h-44 w-full items-end justify-center gap-1">
              <div
                className="w-2/5 min-h-[4px] rounded-t-sm bg-blue-400 dark:bg-blue-600"
                style={{ height: `${(point.interviews / max) * 100}%` }}
                title={`Created: ${point.interviews}`}
              />
              <div
                className="w-2/5 min-h-[4px] rounded-t-sm bg-emerald-400 dark:bg-emerald-600"
                style={{ height: `${(point.completed / max) * 100}%` }}
                title={`Completed: ${point.completed}`}
              />
            </div>
            <div className="text-center text-[10px] font-medium text-zinc-500 sm:text-xs">
              {point.label ?? point.date ?? `P${idx + 1}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketDemandSection({ market }: { market?: MarketTrends }) {
  if (!market) {
    return (
      <div className="empty-state text-sm text-zinc-500">
        Market demand data is unavailable.
      </div>
    );
  }

  const topSkills = market.topSkills ?? [];
  const topRoles = market.topRoles ?? [];
  const skillMax = Math.max(1, ...topSkills.map((s) => s.positionsNeeded));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Clients"
          value={market.activeClients ?? 0}
          accent="blue"
          description="Open client positions"
        />
        <StatCard
          title="Bench / B2B Demand"
          value={market.benchDemand ?? 0}
          accent="emerald"
          description="Reconciled open bench positions"
        />
        <StatCard
          title="Market Demand"
          value={market.marketDemand ?? 0}
          accent="purple"
          description="Reconciled external hiring need"
        />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Skill totals are capped per client to match each client&apos;s bench/market headcount so they align with the summary above.
      </p>

      {topSkills.length > 0 ? (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Top skills in demand
          </h4>
          <div className="space-y-3">
            {topSkills.map((skill) => (
              <div key={skill.skill}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {formatSkillLabel(skill.skill)}
                  </span>
                  <span className="text-zinc-500">
                    {skill.positionsNeeded} open
                    {skill.clientCount != null && skill.clientCount > 0
                      ? ` · ${skill.clientCount} client${skill.clientCount === 1 ? "" : "s"}`
                      : ""}
                    {skill.benchNeeded > 0 || skill.marketNeeded > 0
                      ? ` · Bench ${skill.benchNeeded} · Market ${skill.marketNeeded}`
                      : ""}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${(skill.positionsNeeded / skillMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          No skill-based requirements yet. Add clients with skill requirements to see demand trends.
        </p>
      )}

      {topRoles.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Active roles
          </h4>
          <div className="flex flex-wrap gap-2">
            {topRoles.map((role) => (
              <span
                key={role.role}
                className="master-data-category-chip"
              >
                {role.role}
                <span className="ml-1 opacity-70">({role.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardTrendsTab({ trends }: { trends: TrendsResponse | null }) {
  const [view, setView] = useState<"daily" | "weekly" | "market">("weekly");

  const daily = trends?.dailyTrends ?? [];
  const weekly = trends?.weeklyTrends ?? [];
  const market = trends?.marketTrends;

  const subTabs = [
    { id: "weekly" as const, label: "Weekly (4 wks)" },
    { id: "daily" as const, label: "Daily (7 days)" },
    { id: "market" as const, label: "Market Demand" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trends & demand"
        description={
          trends?.generatedAt
            ? `Last updated ${new Date(trends.generatedAt).toLocaleString()}`
            : "Interview activity and current client skill demand"
        }
      />

      <div className="tab-bar w-fit max-w-full">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={
              view === tab.id ? "tab-bar-item tab-bar-item-active" : "tab-bar-item"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel-card border-l-4 border-l-indigo-500">
        <div className="panel-header">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {view === "market"
              ? "Current market demand"
              : view === "daily"
                ? "Daily interview activity"
                : "Weekly interview activity"}
          </h3>
        </div>
        <div className="p-5">
          {view === "market" ? (
            <MarketDemandSection market={market} />
          ) : (
            <TrendBarChart
              points={view === "daily" ? daily : weekly}
              emptyHint="Could not load trend data. Check that analytics service is running."
            />
          )}
        </div>
        {view !== "market" && (
          <div className="flex justify-center gap-6 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-blue-400 dark:bg-blue-600" />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Created</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Completed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
