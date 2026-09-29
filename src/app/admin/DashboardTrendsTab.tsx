"use client";

import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/formatDate";
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
      <div className="empty-state text-sm text-[var(--text-secondary)]">{emptyHint}</div>
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
        <p className="mb-4 text-xs font-medium text-[var(--text-secondary)]">
          No interview activity in this period yet — bars will fill as interviews are created and completed.
        </p>
      )}
      <div className="h-72 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
            barGap={6}
          >
            <defs>
              <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#4C1D95" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
            <XAxis
              dataKey="name"
              stroke="var(--text-secondary)"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              dy={5}
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-subtle)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 p-3.5 shadow-lg backdrop-blur-md">
                      <p className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)] mb-2 border-b border-[var(--border)] pb-1.5">{payload[0].payload.name}</p>
                      <div className="space-y-1.5">
                        <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center justify-between gap-4 font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 inline-block shadow-xs" />
                            Created:
                          </span>
                          <span>{payload[0].value}</span>
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-4 font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 inline-block shadow-xs" />
                            Completed:
                          </span>
                          <span>{payload[1].value}</span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="created" fill="url(#createdGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="completed" fill="url(#completedGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MarketDemandSection({ market }: { market?: MarketTrends }) {
  if (!market) {
    return (
      <div className="empty-state text-sm text-[var(--text-secondary)]">
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
          accent="purple"
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
          accent="blue"
          description="Reconciled external hiring need"
        />
      </div>

      <p className="text-xs font-medium text-[var(--text-secondary)]">
        Skill totals are capped per client to match each client&apos;s bench/market headcount so they align with the summary above.
      </p>

      {topSkills.length > 0 ? (
        <div>
          <h4 className="mb-3 text-sm font-bold text-[var(--text-primary)]">
            Top skills in demand
          </h4>
          <div className="space-y-3">
            {topSkills.map((skill) => (
              <div key={skill.skill} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xs hover:border-purple-300/40 transition-colors">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-bold text-[var(--text-primary)]">
                    {formatSkillLabel(skill.skill)}
                  </span>
                  <span className="text-[var(--text-secondary)] font-medium">
                    {skill.positionsNeeded} open
                    {skill.clientCount != null && skill.clientCount > 0
                      ? ` · ${skill.clientCount} client${skill.clientCount === 1 ? "" : "s"}`
                      : ""}
                    {skill.benchNeeded > 0 || skill.marketNeeded > 0
                      ? ` · Bench ${skill.benchNeeded} · Market ${skill.marketNeeded}`
                      : ""}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] p-[1px] shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95]"
                    style={{ width: `${(skill.positionsNeeded / skillMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          No skill-based requirements yet. Add clients with skill requirements to see demand trends.
        </p>
      )}

      {topRoles.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-bold text-[var(--text-primary)]">
            Active roles
          </h4>
          <div className="flex flex-wrap gap-2">
            {topRoles.map((role) => (
              <span
                key={role.role}
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-2xs"
              >
                {role.role}
                <span className="opacity-75 font-mono">({role.count})</span>
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
    <div className="space-y-6 animate-in">
      <SectionHeader
        title="Trends & demand"
        description={
          trends?.generatedAt
            ? `Last updated ${formatDateTime(trends.generatedAt)}`
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
              view === tab.id
                ? "tab-bar-item tab-bar-item-active !text-white hover:!text-white"
                : "tab-bar-item text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
        <div className="panel-header panel-header-accent-indigo">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
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
          <div className="flex justify-center gap-8 border-t border-[var(--border)] px-5 py-4 bg-[var(--surface-subtle)]/40">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 inline-block shadow-xs" />
              <span className="text-xs font-bold text-[var(--text-primary)]">Created</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 inline-block shadow-xs" />
              <span className="text-xs font-bold text-[var(--text-primary)]">Completed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
