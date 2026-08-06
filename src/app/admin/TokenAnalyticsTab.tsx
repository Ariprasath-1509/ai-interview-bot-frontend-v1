'use client';

import Link from 'next/link';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TokenBucket { date: string; label: string; tokens: number; costUsd: number; }
export interface PeriodTokenData {
  totalTokens: number;
  avgDailyTokens: number;
  totalCostUsd: number;
  dailyLimit: number;
  buckets: TokenBucket[];
}
export interface PerInterviewTokenData {
  count: number;
  avgTotalTokens: number;
  avgQuestionTokens: number;
  avgAssessmentTokens: number;
  avgRubricTokens: number;
  maxTotalTokens: number;
  totalCostUsd: number;
  avgCostPerInterviewUsd: number;
}
export interface TodayTokenData {
  usage: number;
  limit: number;
  warningThreshold: number;
  nearLimit: boolean;
  overLimit: boolean;
  remainingTokens: number;
}

interface Props {
  today: TodayTokenData | null;
  weekly: PeriodTokenData | null;
  monthly: PeriodTokenData | null;
  perInterview: PerInterviewTokenData | null;
}

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  blue:    '#3b82f6',
  purple:  '#8b5cf6',
  cyan:    '#06b6d4',
  teal:    '#14b8a6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  zinc:    '#71717a',
};

const PIE_COLORS = [C.blue, C.purple, C.cyan];

// ── Custom tooltip styles ─────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: 'var(--tooltip-bg, #18181b)',
  border: '1px solid var(--tooltip-border, #3f3f46)',
  borderRadius: 8,
  fontSize: 12,
  color: '#f4f4f5',
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString(); }
function fmtCost(n: number | string) { return `$${Number(n).toFixed(4)}`; }
function fmtPct(part: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function KpiChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium">{label}</span>
      <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-tight">{value}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}

// ── Weekly bar chart tooltip ───────────────────────────────────────────────────

function WeeklyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const tokens = payload.find((p: any) => p.dataKey === 'tokens');
  const cost   = payload.find((p: any) => p.dataKey === 'costUsd');
  return (
    <div style={tooltipStyle} className="px-3 py-2 shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {tokens && <p style={{ color: C.blue }}>Tokens: {fmt(tokens.value)}</p>}
      {cost   && <p style={{ color: C.emerald }}>Cost: ${Number(cost.value).toFixed(6)}</p>}
    </div>
  );
}

// ── Monthly area chart tooltip ────────────────────────────────────────────────

function MonthlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const tokens = payload.find((p: any) => p.dataKey === 'tokens');
  const cost   = payload.find((p: any) => p.dataKey === 'costUsd');
  return (
    <div style={tooltipStyle} className="px-3 py-2 shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {tokens && <p style={{ color: C.blue }}>Tokens: {fmt(tokens.value)}</p>}
      {cost   && <p style={{ color: C.emerald }}>Cost: ${Number(cost.value).toFixed(6)}</p>}
    </div>
  );
}

// ── Pie chart label ───────────────────────────────────────────────────────────

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TokenAnalyticsTab({ today, weekly, monthly, perInterview }: Props) {
  const budgetPct = today ? Math.min(100, (today.usage / today.limit) * 100) : 0;
  const budgetColor = today?.overLimit ? C.red : today?.nearLimit ? C.amber : C.emerald;

  // Pie data for per-interview breakdown
  const pieData = perInterview ? [
    { name: 'Assessment', value: Math.round(perInterview.avgAssessmentTokens) },
    { name: 'Questions',  value: Math.round(perInterview.avgQuestionTokens) },
    { name: 'Rubric',     value: Math.round(perInterview.avgRubricTokens) },
  ].filter(d => d.value > 0) : [];

  const totalPieTokens = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">

      {/* ── Today's budget ─────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Today&apos;s Token Budget</h3>
          <Link href="/admin/settings/tokens" className="text-xs text-blue-600 hover:underline font-medium">
            Manage Limits →
          </Link>
        </div>

        {today ? (
          <div className="space-y-4">
            {/* Budget bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>0</span>
                <span>{today.overLimit ? 'Over limit' : today.nearLimit ? 'Near limit' : `${budgetPct.toFixed(1)}% used`}</span>
                <span>{fmt(today.limit)}</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${budgetPct}%`, backgroundColor: budgetColor }}
                />
              </div>
            </div>

            {/* 3 stat chips */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Used Today</div>
                <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{fmt(today.usage)}</div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Remaining</div>
                <div className="text-2xl font-bold font-mono" style={{ color: budgetColor }}>{fmt(today.remainingTokens)}</div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Daily Limit</div>
                <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{fmt(today.limit)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-zinc-400 text-sm">Token data unavailable</div>
        )}
      </div>

      {/* ── Weekly bar chart ────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">7-Day Token Usage</h3>
          {weekly && (
            <div className="flex flex-wrap gap-6">
              <KpiChip label="Total" value={fmt(weekly.totalTokens)} />
              <KpiChip label="Avg / day" value={fmt(weekly.avgDailyTokens)} />
              <KpiChip label="Est. cost" value={fmtCost(weekly.totalCostUsd)} />
            </div>
          )}
        </div>

        {weekly?.buckets?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekly.buckets} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                width={36}
              />
              <Tooltip content={<WeeklyTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
              {weekly.dailyLimit > 0 && (
                <ReferenceLine
                  y={weekly.dailyLimit}
                  stroke={C.amber}
                  strokeDasharray="5 3"
                  label={{ value: 'Limit', fill: C.amber, fontSize: 10, position: 'insideTopRight' }}
                />
              )}
              <Bar dataKey="tokens" name="Tokens" fill={C.blue} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-zinc-400 text-sm">
            {weekly ? 'No usage data for this week' : 'Loading…'}
          </div>
        )}

        {/* Cost mini-bar */}
        {weekly?.buckets?.length ? (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">Cost per day (USD)</p>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={weekly.buckets} margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                <XAxis dataKey="label" hide />
                <YAxis hide />
                <Tooltip
                  formatter={(v: any) => [`$${Number(v).toFixed(6)}`, 'Cost']}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                />
                <Bar dataKey="costUsd" name="Cost" fill={C.emerald} radius={[3, 3, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>

      {/* ── Monthly area chart ──────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">30-Day Token Trend</h3>
          {monthly && (
            <div className="flex flex-wrap gap-6">
              <KpiChip label="Total" value={fmt(monthly.totalTokens)} />
              <KpiChip label="Avg / day" value={fmt(monthly.avgDailyTokens)} />
              <KpiChip label="Est. cost" value={fmtCost(monthly.totalCostUsd)} />
              <KpiChip label="Daily cap" value={fmt(monthly.dailyLimit)} />
            </div>
          )}
        </div>

        {monthly?.buckets?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthly.buckets} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                width={36}
              />
              <Tooltip content={<MonthlyTooltip />} cursor={{ stroke: C.blue, strokeWidth: 1, strokeDasharray: '4 2' }} />
              {monthly.dailyLimit > 0 && (
                <ReferenceLine
                  y={monthly.dailyLimit}
                  stroke={C.amber}
                  strokeDasharray="5 3"
                  label={{ value: 'Daily limit', fill: C.amber, fontSize: 10, position: 'insideTopRight' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="tokens"
                name="Tokens"
                stroke={C.blue}
                strokeWidth={2}
                fill="url(#blueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: C.blue }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-zinc-400 text-sm">
            {monthly ? 'No usage data for this month' : 'Loading…'}
          </div>
        )}
      </div>

      {/* ── Per-interview breakdown ─────────────────────────────────────────── */}
      {perInterview && perInterview.count > 0 ? (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">
            Per-Interview Token Breakdown
            <span className="ml-2 text-sm font-normal text-zinc-400">({fmt(perInterview.count)} interviews)</span>
          </h3>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Pie chart — avg token type split */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Avg token split</p>
              {pieData.length > 0 ? (
                <PieChart width={200} height={200}>
                  <Pie
                    data={pieData}
                    cx={100}
                    cy={100}
                    outerRadius={90}
                    innerRadius={50}
                    dataKey="value"
                    labelLine={false}
                    label={PieLabel}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: any) => [
                      `${fmt(v)} tokens (${fmtPct(v, totalPieTokens)})`,
                      name as string,
                    ]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-zinc-400 text-sm">No data</div>
              )}

              {/* Legend */}
              <div className="flex flex-col gap-1.5 mt-1">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="font-medium">{d.name}</span>
                    <span className="font-mono text-zinc-400">{fmt(d.value)}</span>
                    <span className="text-zinc-300 dark:text-zinc-600">({fmtPct(d.value, totalPieTokens)})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats grid */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                { label: 'Avg Total / Interview',     value: fmt(Math.round(perInterview.avgTotalTokens)),     color: 'text-zinc-900 dark:text-zinc-100' },
                { label: 'Max Single Interview',      value: fmt(perInterview.maxTotalTokens),                  color: 'text-zinc-700 dark:text-zinc-300' },
                { label: 'Avg Assessment Tokens',     value: fmt(Math.round(perInterview.avgAssessmentTokens)), color: 'text-purple-700 dark:text-purple-400' },
                { label: 'Avg Question Tokens',       value: fmt(Math.round(perInterview.avgQuestionTokens)),   color: 'text-blue-700 dark:text-blue-400' },
                { label: 'Avg Rubric Tokens',         value: fmt(Math.round(perInterview.avgRubricTokens)),     color: 'text-teal-700 dark:text-teal-400' },
                { label: 'Total AI Cost (all-time)',  value: fmtCost(perInterview.totalCostUsd),                color: 'text-emerald-700 dark:text-emerald-400' },
                { label: 'Avg Cost / Interview',      value: `$${Number(perInterview.avgCostPerInterviewUsd).toFixed(6)}`, color: 'text-emerald-700 dark:text-emerald-400' },
                { label: 'Interviews Analysed',       value: fmt(perInterview.count),                           color: 'text-zinc-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 mb-1 leading-tight">{label}</div>
                  <div className={`text-base font-bold font-mono ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Horizontal stacked comparison bar */}
          {totalPieTokens > 0 && (
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Token distribution per interview</p>
              <div className="w-full h-6 rounded-full overflow-hidden flex">
                {pieData.map((d, i) => (
                  <div
                    key={d.name}
                    title={`${d.name}: ${fmt(d.value)} (${fmtPct(d.value, totalPieTokens)})`}
                    style={{ width: `${(d.value / totalPieTokens) * 100}%`, backgroundColor: PIE_COLORS[i] }}
                    className="h-full transition-all duration-500"
                  />
                ))}
              </div>
              <div className="flex gap-4 mt-2 flex-wrap">
                {pieData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i] }} />
                    {d.name} {fmtPct(d.value, totalPieTokens)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : perInterview !== null && (
        <div className="card p-6 text-zinc-400 text-sm">No per-interview data yet — run some interviews first.</div>
      )}

      <div className="flex justify-end">
        <Link href="/admin/reports" className="text-sm text-blue-600 hover:underline font-medium">
          Download full management report →
        </Link>
      </div>
    </div>
  );
}
