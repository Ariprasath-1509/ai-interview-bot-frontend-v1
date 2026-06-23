"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon: LucideIcon;
  color?: "blue" | "emerald" | "amber" | "red" | "purple" | "zinc";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/20",
    icon: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  zinc: {
    bg: "bg-zinc-50 dark:bg-zinc-950/20",
    icon: "text-zinc-600 dark:text-zinc-400",
    border: "border-zinc-200 dark:border-zinc-800",
  },
};

export function StatCard({ title, value, change, icon: Icon, color = "zinc" }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
          {change && (
            <p className={`text-xs font-medium ${
              change.trend === "up" ? "text-emerald-600 dark:text-emerald-400" :
              change.trend === "down" ? "text-red-600 dark:text-red-400" :
              "text-zinc-500 dark:text-zinc-400"
            }`}>
              {change.trend === "up" ? "↗" : change.trend === "down" ? "↘" : "→"} {change.value}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2 ${colors.icon}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

interface StatsGridProps {
  stats: Array<{
    title: string;
    value: string | number;
    change?: { value: string; trend: "up" | "down" | "neutral" };
    icon: LucideIcon;
    color?: "blue" | "emerald" | "amber" | "red" | "purple" | "zinc";
  }>;
  className?: string;
}

export function StatsGrid({ stats, className = "" }: StatsGridProps) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
}