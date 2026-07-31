"use client";

import { useMemo, useState } from "react";
import { SectionHeader, StatCard } from "@/components/common/AppUi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  if (points.length === 0) {
    return (
      <div className="empty-state text-sm text-zinc-500">{emptyHint}</div>
    );
  }

  const allZero = points.every((p) => p.interviews === 0 && p.completed === 0);

  const chartData = points.map((p, idx) => ({
    name: p.label ?? p.date ?? p.week ?? `P${idx + 1}`,
    created: p.interviews,
    completed: p.completed,
  }));

  return (
    <div className="w-full">
      {allZero && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          No interview activity in this period yet — bars will fill as interviews are created and completed.
        </p>
      )}
      <div className="h-64 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-zinc-800" />
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-md backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1.5">{payload[0].payload.name}</p>
                      <div className="space-y-1">
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-semibold">
                          <span className="h-2.5 w-2.5 rounded bg-blue-500 inline-block" />
                          Created: {payload[0].value}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                          <span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block" />
                          Completed: {payload[1].value}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="created" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
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
